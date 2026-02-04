import React, { useState, useRef } from 'react';
import api from '../utils/api';
import './UploadTab.css';

function UploadTab() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files.length > 0) {
            uploadFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        setIsUploading(true);
        setUploadResult(null);

        try {
            const response = await api.post('/ingest/file', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setUploadResult({
                    type: 'success',
                    message: 'העלאה הושלמה בהצלחה!',
                    data: response.data.data
                });
            } else {
                setUploadResult({
                    type: 'error',
                    message: response.data.detail || 'שגיאה בהעלאה'
                });
            }
        } catch (error) {
            setUploadResult({
                type: 'error',
                message: error.response?.data?.detail || error.message || 'שגיאה בהעלאה'
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="upload-tab">
            <div className="card">
                <h2>העלאת מסמך חדש</h2>
                <div
                    className={`upload-area ${isDragging ? 'dragover' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.doc,.xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                    <div className="upload-placeholder">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <p>לחץ כאן או גרור קובץ להעלאה</p>
                        <p className="file-types">PDF, DOCX, TXT, DOC, XLSX, XLS</p>
                    </div>
                </div>

                {isUploading && (
                    <div className="progress-bar">
                        <div className="progress-fill"></div>
                    </div>
                )}

                {uploadResult && (
                    <div className={`upload-result ${uploadResult.type}`}>
                        <strong>{uploadResult.type === 'success' ? '✓' : '✗'} {uploadResult.message}</strong>
                        {uploadResult.data && (
                            <div style={{ marginTop: '10px' }}>
                                <p>קובץ: {uploadResult.data.filename}</p>
                                <p>מספר חלקים שנוצרו: {uploadResult.data.chunks_count}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default UploadTab;
