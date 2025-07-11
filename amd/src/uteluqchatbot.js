/**
 * @copyright 2025 Université TÉLUQ and the UNIVERSITÉ GASTON BERGER DE SAINT-LOUIS
 */

define(['jquery', 'core/str', 'core/ajax', 'core/notification'], function($, str, ajax, notification) {
    return {
        init: function(wwwroot, sesskey, userid, courseid) {
            // Toggle prompt modal
            const togglePromptModal = function() {
                const modal = document.querySelector('.block_uteluqchatbot #promptModal');
                modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
            };

            // Toggle file upload modal
            const toggleFileUploadModal = function () {
                const modal = document.querySelector('.block_uteluqchatbot #fileUploadModal');
                if (modal) {
                    modal.style.display = modal.style.display === 'none' || modal.style.display === '' ? 'flex' : 'none';

                    if (modal.style.display === 'none') {
                        const form = document.querySelector('.block_uteluqchatbot #fileUploadForm');
                        const container = document.querySelector('.block_uteluqchatbot #uploadedFilesContainer');
                        if (form) form.reset();
                        if (container) container.innerHTML = '';
                    }
                }
            };

            /**
             * Convert files to base64 for transmission
             * @param {FileList} files
             * @return {Promise<Array>}
             */
            const convertFilesToBase64 = (files) => {
                const filePromises = Array.from(files).map(file => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const base64Content = reader.result.split(',')[1]; // Remove data:... prefix
                            resolve({
                                filename: file.name,
                                filecontent: base64Content
                            });
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                });
                return Promise.all(filePromises);
            };

            // Handle chat form submission
            $(".block_uteluqchatbot #chatform").on("submit", function(e) {
                e.preventDefault();
                const question = $(".block_uteluqchatbot #question").val();
                const errorDiv = $(".block_uteluqchatbot #error-message");

                str.get_string('sending_question', 'block_uteluqchatbot').then(function(sendingQuestionStr) {
                    errorDiv.text(sendingQuestionStr);
                }).catch(function() {
                    str.get_string('sending_question_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                        errorDiv.text(fallbackStr);
                    }).catch(function() {
                        errorDiv.text("Sending the question...");
                    });
                });

                // Use AJAX call instead of fetch
                const request = {
                    methodname: 'block_uteluqchatbot_send_question',
                    args: {
                        question: question,
                        userid: userid,
                        courseid: courseid,
                        sansrag: false
                    }
                };

                ajax.call([request])[0]
                    .then(function(data) {
                        errorDiv.text("");
                        if (data.status === 'error') {
                            str.get_string('error', 'block_uteluqchatbot').then(function(errorStr) {
                                errorDiv.text(errorStr + ': ' + data.error);
                            }).catch(function() {
                                str.get_string('error_colon_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                    errorDiv.text(fallbackStr + data.error);
                                }).catch(function() {
                                    errorDiv.text("Error: " + data.error);
                                });
                            });
                            return;
                        }
                        const chatMessages = $(".block_uteluqchatbot #chat-messages");
                        chatMessages.append(`
                            <div class="message user-message">${question}</div>
                            <div class="message bot-message">${data.answer}</div>
                        `);
                        $(".block_uteluqchatbot #question").val("");
                        chatMessages.scrollTop(chatMessages[0].scrollHeight);
                    })
                    .catch(function(error) {
                        console.error("Error:", error);
                        
                        str.get_string('unknown_error_occurred', 'block_uteluqchatbot').then(function(unknownErrorStr) {
                            const errorMessage = error && error.message ? error.message : unknownErrorStr;
                            
                            str.get_string('error_sending_question', 'block_uteluqchatbot').then(function(errorSendingQuestionStr) {
                                errorDiv.text(errorSendingQuestionStr + errorMessage);
                            }).catch(function() {
                                str.get_string('error_sending_question_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                    errorDiv.text(fallbackStr + errorMessage);
                                }).catch(function() {
                                    errorDiv.text("Error sending the question: " + errorMessage);
                                });
                            });
                        }).catch(function() {
                            const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
                            str.get_string('error_sending_question', 'block_uteluqchatbot').then(function(errorSendingQuestionStr) {
                                errorDiv.text(errorSendingQuestionStr + errorMessage);
                            }).catch(function() {
                                str.get_string('error_sending_question_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                    errorDiv.text(fallbackStr + errorMessage);
                                }).catch(function() {
                                    errorDiv.text("Error sending the question: " + errorMessage);
                                });
                            });
                        });
                    });
            });

            // Handle prompt form submission
            $(".block_uteluqchatbot #promptform").on("submit", function(e) {
                e.preventDefault();
                const prompttext = $(".block_uteluqchatbot #prompttext").val();
                const errorDiv = $(".block_uteluqchatbot #error-message");

                str.get_string('saving_prompt', 'block_uteluqchatbot').then(function(savingPromptStr) {
                    errorDiv.text(savingPromptStr);
                }).catch(function() {
                    str.get_string('saving_prompt_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                        errorDiv.text(fallbackStr);
                    }).catch(function() {
                        errorDiv.text("Saving the prompt...");
                    });
                });

                // Use AJAX call instead of fetch
                const request = {
                    methodname: 'block_uteluqchatbot_save_prompt',
                    args: {
                        prompttext: prompttext,
                        userid: userid,
                        courseid: courseid
                    }
                };

                ajax.call([request])[0]
                    .then(function(data) {
                        errorDiv.text("");
                        if (data.status === 'error') {
                            str.get_string('error', 'block_uteluqchatbot').then(function(errorStr) {
                                errorDiv.text(errorStr + ': ' + data.error);
                            }).catch(function() {
                                str.get_string('error_colon_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                    errorDiv.text(fallbackStr + data.error);
                                }).catch(function() {
                                    errorDiv.text("Error: " + data.error);
                                });
                            });
                            return;
                        }
                        str.get_string('prompt_saved_successfully', 'block_uteluqchatbot').then(function(promptSavedSuccessfullyStr) {
                            errorDiv.text(promptSavedSuccessfullyStr);
                        }).catch(function() {
                            str.get_string('prompt_saved_successfully_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                errorDiv.text(fallbackStr);
                            }).catch(function() {
                                errorDiv.text("Prompt saved successfully!");
                            });
                        });
                        togglePromptModal();
                        setTimeout(function() {
                            location.reload();
                        }, 1500);
                    })
                    .catch(function(error) {
                        console.error("Error:", error);
                        
                        str.get_string('unknown_error_occurred', 'block_uteluqchatbot').then(function(unknownErrorStr) {
                            const errorMessage = error && error.message ? error.message : unknownErrorStr;
                            
                            str.get_string('error_saving_prompt', 'block_uteluqchatbot').then(function(errorSavingPromptStr) {
                                errorDiv.text(errorSavingPromptStr + errorMessage);
                            }).catch(function() {
                                str.get_string('error_saving_prompt_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                    errorDiv.text(fallbackStr + errorMessage);
                                }).catch(function() {
                                    errorDiv.text("Error saving the prompt: " + errorMessage);
                                });
                            });
                        }).catch(function() {
                            const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
                            str.get_string('error_saving_prompt', 'block_uteluqchatbot').then(function(errorSavingPromptStr) {
                                errorDiv.text(errorSavingPromptStr + errorMessage);
                            }).catch(function() {
                                str.get_string('error_saving_prompt_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                    errorDiv.text(fallbackStr + errorMessage);
                                }).catch(function() {
                                    errorDiv.text("Error saving the prompt: " + errorMessage);
                                });
                            });
                        });
                    });
            });

            // Handle file upload form submission
            const fileUploadForm = document.querySelector(".block_uteluqchatbot #fileUploadForm");
            if (fileUploadForm) {
                fileUploadForm.addEventListener("submit", function(e) {
                    e.preventDefault();
                    
                    const fileInput = document.querySelector('.block_uteluqchatbot #file');
                    const errorDiv = document.querySelector(".block_uteluqchatbot #error-message");
                    
                    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                        str.get_string('no_files_selected', 'block_uteluqchatbot').then(function(noFilesStr) {
                            errorDiv.textContent = noFilesStr;
                        }).catch(function() {
                            str.get_string('no_files_selected_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                errorDiv.textContent = fallbackStr;
                            }).catch(function() {
                                errorDiv.textContent = "No files selected.";
                            });
                        });
                        return;
                    }

                    str.get_string('uploading_file', 'block_uteluqchatbot').then(function(uploadingFileStr) {
                        errorDiv.textContent = uploadingFileStr;
                    }).catch(function() {
                        str.get_string('uploading_files_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                            errorDiv.textContent = fallbackStr;
                        }).catch(function() {
                            errorDiv.textContent = "Uploading files...";
                        });
                    });

                    // Convert files to base64 and send via external service
                    convertFilesToBase64(fileInput.files)
                        .then(function(filesData) {
                            str.get_string('files_converted_debug', 'block_uteluqchatbot').then(function(debugStr) {
                                
                            }).catch(function() {
                                
                            });
                            
                            const request = {
                                methodname: 'block_uteluqchatbot_upload_files',
                                args: {
                                    courseid: courseid,
                                    files: filesData
                                }
                            };

                            str.get_string('sending_ajax_request_debug', 'block_uteluqchatbot').then(function(debugStr) {
                                
                            }).catch(function() {
                                
                            });
                            return ajax.call([request])[0];
                        })
                        .then(function(response) {
                            str.get_string('upload_response_received_debug', 'block_uteluqchatbot').then(function(debugStr) {
                                
                            }).catch(function() {
                                
                            });
                            
                            str.get_string('response_type_debug', 'block_uteluqchatbot').then(function(debugStr) {
                                
                            }).catch(function() {
                                
                            });
                            
                            errorDiv.textContent = "";
                            
                            if (response && response.success) {
                                str.get_string('file_indexed_successfully', 'block_uteluqchatbot').then(function(fileIndexedStr) {
                                    errorDiv.textContent = fileIndexedStr;
                                }).catch(function() {
                                    str.get_string('files_indexed_successfully_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                        errorDiv.textContent = fallbackStr;
                                    }).catch(function() {
                                        errorDiv.textContent = response.message || "Files indexed successfully!";
                                    });
                                });

                                // Reset form and close modal
                                fileUploadForm.reset();
                                const container = document.querySelector('.block_uteluqchatbot #uploadedFilesContainer');
                                if (container) container.innerHTML = '';
                                toggleFileUploadModal();

                                setTimeout(function() {
                                    location.reload();
                                }, 1500);
                            } else {
                                str.get_string('unknown_error', 'block_uteluqchatbot').then(function(unknownErrorStr) {
                                    const responseMessage = response && response.message ? response.message : unknownErrorStr;
                                    
                                    str.get_string('error_processing_file', 'block_uteluqchatbot').then(function(errorProcessingStr) {
                                        errorDiv.textContent = errorProcessingStr + ': ' + responseMessage;
                                    }).catch(function() {
                                        str.get_string('error_processing_files_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                            errorDiv.textContent = fallbackStr + responseMessage;
                                        }).catch(function() {
                                            errorDiv.textContent = "Error processing files: " + responseMessage;
                                        });
                                    });
                                }).catch(function() {
                                    const responseMessage = response && response.message ? response.message : 'Unknown error';
                                    str.get_string('error_processing_file', 'block_uteluqchatbot').then(function(errorProcessingStr) {
                                        errorDiv.textContent = errorProcessingStr + ': ' + responseMessage;
                                    }).catch(function() {
                                        str.get_string('error_processing_files_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                            errorDiv.textContent = fallbackStr + responseMessage;
                                        }).catch(function() {
                                            errorDiv.textContent = "Error processing files: " + responseMessage;
                                        });
                                    });
                                });
                            }
                        })
                        .catch(function(error) {
                            str.get_string('upload_error_details_debug', 'block_uteluqchatbot').then(function(debugStr) {
                                console.error(debugStr, error);
                            }).catch(function() {
                                console.error("Upload error details:", error);
                            });
                            
                            str.get_string('error_object_debug', 'block_uteluqchatbot').then(function(debugStr) {
                                
                            }).catch(function() {
                                
                            });
                            
                            // If the error contains a raw response, display it.
                            if (error && error.responseText) {
                                str.get_string('raw_server_response_debug', 'block_uteluqchatbot').then(function(debugStr) {
                                    
                                }).catch(function() {
                                    
                                });
                                
                                str.get_string('server_response_error', 'block_uteluqchatbot').then(function(serverErrorStr) {
                                    errorDiv.textContent = serverErrorStr;
                                }).catch(function() {
                                    errorDiv.textContent = "Server response error. Check console for details.";
                                });
                                return;
                            }
                            
                            // Secure error handling
                            str.get_string('unknown_error_occurred', 'block_uteluqchatbot').then(function(unknownErrorStr) {
                                let errorMessage = unknownErrorStr;
                                if (error) {
                                    if (typeof error === 'string') {
                                        errorMessage = error;
                                    } else if (error.message) {
                                        errorMessage = error.message;
                                    } else if (error.error) {
                                        errorMessage = error.error;
                                    } else if (error.exception && error.exception.message) {
                                        errorMessage = error.exception.message;
                                    } else {
                                        str.get_string('server_error_check_console', 'block_uteluqchatbot').then(function(serverErrorStr) {
                                            errorMessage = serverErrorStr;
                                        }).catch(function() {
                                            errorMessage = "Server error - check console for details";
                                        });
                                    }
                                }
                                
                                str.get_string('error_processing_file', 'block_uteluqchatbot').then(function(errorProcessingStr) {
                                    errorDiv.textContent = errorProcessingStr + ': ' + errorMessage;
                                }).catch(function() {
                                    str.get_string('error_processing_files_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                        errorDiv.textContent = fallbackStr + errorMessage;
                                    }).catch(function() {
                                        errorDiv.textContent = "Error processing files: " + errorMessage;
                                    });
                                });
                            }).catch(function() {
                                let errorMessage = 'Unknown error occurred';
                                if (error) {
                                    if (typeof error === 'string') {
                                        errorMessage = error;
                                    } else if (error.message) {
                                        errorMessage = error.message;
                                    } else if (error.error) {
                                        errorMessage = error.error;
                                    } else if (error.exception && error.exception.message) {
                                        errorMessage = error.exception.message;
                                    } else {
                                        errorMessage = "Server error - check console for details";
                                    }
                                }
                                
                                str.get_string('error_processing_file', 'block_uteluqchatbot').then(function(errorProcessingStr) {
                                    errorDiv.textContent = errorProcessingStr + ': ' + errorMessage;
                                }).catch(function() {
                                    str.get_string('error_processing_files_fallback', 'block_uteluqchatbot').then(function(fallbackStr) {
                                        errorDiv.textContent = fallbackStr + errorMessage;
                                    }).catch(function() {
                                        errorDiv.textContent = "Error processing files: " + errorMessage;
                                    });
                                });
                            });
                        });
                });
            }

            // Expose functions to the global scope for HTML onclick handlers
            window.togglePromptModal = togglePromptModal;
            window.toggleFileUploadModal = toggleFileUploadModal;
        }
    };
});