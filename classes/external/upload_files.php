<?php
/**
 * External API for file upload and indexing
 * @copyright 2025 Université TÉLUQ and the UNIVERSITÉ GASTON BERGER DE SAINT-LOUIS
 */

namespace block_uteluqchatbot\external;

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;
use context_course;
use Exception;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/externallib.php');

class upload_files extends external_api {

    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, get_string('course_id', 'block_uteluqchatbot')),
            'files' => new external_multiple_structure(
                new external_single_structure([
                    'filename' => new external_value(PARAM_TEXT, get_string('file_name', 'block_uteluqchatbot')),
                    'filecontent' => new external_value(PARAM_RAW, get_string('file_content_base64', 'block_uteluqchatbot')),
                ])
            )
        ]);
    }

    /**
     * Get file extension
     * @param string $filename
     * @return string
     */
    private static function get_file_extension($filename) {
        return strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    }

    /**
     * Check if file is PDF
     * @param string $filename
     * @return bool
     */
    private static function is_pdf($filename) {
        return self::get_file_extension($filename) === 'pdf';
    }

    /**
     * Check if file is text file
     * @param string $filename
     * @return bool
     */
    private static function is_text_file($filename) {
        $textExtensions = ['txt', 'text', 'md'];
        return in_array(self::get_file_extension($filename), $textExtensions);
    }

    /**
     * Execute the file upload and indexing
     * @param int $courseid
     * @param array $files
     * @return array
     */
    public static function execute($courseid, $files) {
        global $CFG, $USER, $DB;

        // Clean any output that might pollute the JSON response
        if (ob_get_level()) {
            ob_end_clean();
        }
        ob_start();

        try {
            // Validate parameters
            $params = self::validate_parameters(self::execute_parameters(), [
                'courseid' => $courseid,
                'files' => $files
            ]);

            // Validate context and capabilities
            $context = context_course::instance($params['courseid']);
            self::validate_context($context);
            
            // Check capabilities with more flexible requirement
            try {
                require_capability('moodle/course:update', $context);
            } catch (Exception $e) {
                // Try alternative capabilities
                if (has_capability('moodle/course:managefiles', $context) || 
                    has_capability('moodle/course:view', $context) || 
                    is_enrolled($context, $USER->id)) {
                    // OK
                } else {
                    throw new Exception(get_string('insufficient_permissions', 'block_uteluqchatbot'));
                }
            }

            // Configuration of API keys and Weaviate URL
            $apiUrl = get_config('block_uteluqchatbot', 'weaviate_api_url');
            $apiKey = get_config('block_uteluqchatbot', 'weaviate_api_key');
            $cohereApiKey = get_config('block_uteluqchatbot', 'cohere_embedding_api_key');

            // Validate required configurations
            if (empty($apiUrl) || empty($apiKey) || empty($cohereApiKey)) {
                throw new Exception(get_string('missing_api_configuration', 'block_uteluqchatbot'));
            }

            // Check if classes exist
            if (!class_exists('\block_uteluqchatbot\weaviate_connector')) {
                throw new Exception(get_string('weaviate_connector_not_found', 'block_uteluqchatbot'));
            }

            // Initialize WeaviateConnector object
            $connector = new \block_uteluqchatbot\weaviate_connector($apiUrl, $apiKey, $cohereApiKey);

            $courseName = 'Course_collection_' . $params['courseid'];
            
            // Delete existing collection and recreate it
            $connector->delete_collection($courseName);
            
            $checkIfCreated = $connector->collection_exists($courseName);

            // Create the collection
            if (!$connector->create_collection($courseName)) {
                $error = $connector->get_last_error();
                throw new Exception(get_string('error_creating_collection', 'block_uteluqchatbot') . ($error ? $error : get_string('unknown_error', 'block_uteluqchatbot')));
            }

            // Create or get a temporary directory for the plugin
            $temppath = make_temp_directory('block_uteluqchatbot');
            $uploadDir = $temppath . '/uploads/';

            // If the uploads subdirectory doesn't exist, create it
            if (!file_exists($uploadDir)) {
                if (!mkdir($uploadDir, 0777, true)) {
                    throw new Exception(get_string('failed_create_upload_directory', 'block_uteluqchatbot'));
                }
            }

            $processedFiles = 0;
            $errors = [];

            foreach ($params['files'] as $index => $file) {
                try {
                    // Validate filename
                    if (empty($file['filename'])) {
                        throw new Exception(get_string('empty_filename', 'block_uteluqchatbot'));
                    }

                    // Check if file type is supported
                    if (!self::is_pdf($file['filename']) && !self::is_text_file($file['filename'])) {
                        throw new Exception(get_string('unsupported_file_type', 'block_uteluqchatbot') . $file['filename']);
                    }

                    // Decode base64 content
                    $fileContent = base64_decode($file['filecontent']);
                    if ($fileContent === false) {
                        throw new Exception(get_string('invalid_file_data', 'block_uteluqchatbot') . $file['filename']);
                    }

                    // Generate unique filename
                    $newFileName = uniqid('file_', true) . '-' . clean_filename($file['filename']);
                    $destination = $uploadDir . $newFileName;

                    // Save file temporarily
                    if (file_put_contents($destination, $fileContent) === false) {
                        throw new Exception(get_string('failed_save_file', 'block_uteluqchatbot') . $file['filename']);
                    }

                    $extractedText = '';
                    $destinationTxt = '';

                    // Process based on file type
                    if (self::is_pdf($file['filename'])) {
                        // PDF processing
                        $adobe_pdf_client_id = get_config('block_uteluqchatbot', 'adobe_pdf_client_id');
                        $adobe_pdf_client_secret = get_config('block_uteluqchatbot', 'adobe_pdf_client_secret');

                        if (empty($adobe_pdf_client_id) || empty($adobe_pdf_client_secret)) {
                            throw new Exception(get_string('adobe_pdf_credentials_not_configured', 'block_uteluqchatbot'));
                        }

                        // Check if PDF extractor class exists
                        if (!class_exists('\block_uteluqchatbot\pdf_extract_api')) {
                            throw new Exception(get_string('pdf_extractor_not_found', 'block_uteluqchatbot'));
                        }

                        $pdfExtractor = new \block_uteluqchatbot\pdf_extract_api($adobe_pdf_client_id, $adobe_pdf_client_secret);
                        $extractedText = $pdfExtractor->process_pdf($destination);

                        if (empty($extractedText)) {
                            throw new Exception(get_string('failed_extract_pdf_text', 'block_uteluqchatbot') . $file['filename']);
                        }

                        // Generate a unique name for the text file
                        $newFileTxtName = uniqid('file_', true) . '-' . $file['filename'] . '.txt';
                        $destinationTxt = $uploadDir . $newFileTxtName;

                        if (file_put_contents($destinationTxt, $extractedText) === false) {
                            throw new Exception(get_string('failed_save_extracted_text', 'block_uteluqchatbot') . $file['filename']);
                        }

                    } else if (self::is_text_file($file['filename'])) {
                        // Text file processing - use the file directly
                        $destinationTxt = $destination;
                        $extractedText = $fileContent;
                    }

                    // Index the text file
                    $indexed = $connector->index_text_file($destinationTxt, $courseName, $courseName);

                    if (!$indexed) {
                        $error = $connector->get_last_error();
                        throw new Exception(get_string('error_indexing_file_unknown', 'block_uteluqchatbot') . $file['filename'] . ': ' . ($error ? $error : get_string('unknown_error', 'block_uteluqchatbot')));
                    }

                    // Clean up temporary files
                    if (file_exists($destinationTxt) && $destinationTxt !== $destination) {
                        unlink($destinationTxt);
                    }
                    if (file_exists($destination)) {
                        unlink($destination);
                    }

                    $processedFiles++;

                } catch (Exception $e) {
                    $errors[] = $file['filename'] . ': ' . $e->getMessage();
                    
                    // Clean up files in case of error
                    if (isset($destinationTxt) && file_exists($destinationTxt) && $destinationTxt !== $destination) {
                        unlink($destinationTxt);
                    }
                    if (isset($destination) && file_exists($destination)) {
                        unlink($destination);
                    }
                }
            }

            // Return results
            if ($processedFiles > 0) {
                $message = $processedFiles . get_string('files_indexed_successfully', 'block_uteluqchatbot');
                if (!empty($errors)) {
                    $message .= get_string('errors_occurred', 'block_uteluqchatbot') . implode('; ', $errors);
                }
                
                return [
                    'success' => true,
                    'message' => $message,
                    'processedfiles' => $processedFiles
                ];
            } else {
                return [
                    'success' => false,
                    'message' => get_string('no_files_processed', 'block_uteluqchatbot') . implode('; ', $errors),
                    'processedfiles' => 0
                ];
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'processedfiles' => 0
            ];
        } finally {
            // Clean output buffer before returning JSON
            if (ob_get_level()) {
                ob_end_clean();
            }
        }
    }

    /**
     * Returns description of method result value
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, get_string('operation_successful', 'block_uteluqchatbot')),
            'message' => new external_value(PARAM_TEXT, get_string('response_message', 'block_uteluqchatbot')),
            'processedfiles' => new external_value(PARAM_INT, get_string('processed_files_count', 'block_uteluqchatbot'))
        ]);
    }
}