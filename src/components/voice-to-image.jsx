import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import axios from 'axios';
import '../App.css';

const VoiceToImage = () => {
  const [imageSets, setImageSets] = useState([{id: 0, images: [null, null, null], prompt: '', language: 'en-IN'}]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [selectedImageForModification, setSelectedImageForModification] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [savedImages, setSavedImages] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [language, setLanguage] = useState('en-IN');
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({
    transcribing: true,
    clearTranscriptOnListen: false
  });

  const currentSet = imageSets[currentSetIndex];
  const CLIPDROP_API_KEY = process.env.REACT_APP_CLIPDROP_API_KEY;

  useEffect(() => {
    // Auto-detect language based on browser settings
    const browserLang = navigator.language || 'en-US';
    if (browserLang.startsWith('te')) {
      setLanguage('te-IN'); // Telugu
    } else if (browserLang.startsWith('hi')) {
      setLanguage('hi-IN'); // Hindi
    } else {
      setLanguage('en-IN'); // Default to English
    }

    // Load folders from localStorage
    const storedFolders = localStorage.getItem('imageFolders');
    if (storedFolders) {
      setFolders(JSON.parse(storedFolders));
    }
  }, []);

  // Save folders to localStorage whenever folders change
  useEffect(() => {
    localStorage.setItem('imageFolders', JSON.stringify(folders));
  }, [folders]);

  const translateText = async (text, targetLanguage = 'en') => {
    if (language === 'en-IN') return text; // Already in English

    setIsTranslating(true);
    try {
      // Using Google Translate API (you'll need to add your API key)
      const response = await axios.post(
        'https://translation.googleapis.com/language/translate/v2',
        {
          q: text,
          target: targetLanguage,
          source: language.split('-')[0] // Extract language code
        },
        {
          params: {
            key: process.env.REACT_APP_GOOGLE_TRANSLATE_API_KEY
          }
        }
      );

      return response.data.data.translations[0].translatedText;
    } catch (error) {
      console.error('Translation failed:', error);
      // Fallback: return original text if translation fails
      return text;
    } finally {
      setIsTranslating(false);
    }
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder = {
      id: Date.now(),
      name: newFolderName.trim(),
      images: [],
      createdAt: new Date().toISOString()
    };

    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setShowFolderInput(false);
  };

  const saveImageToFolder = (imageUrl, folderId, originalImage = null) => {
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        const imageData = {
          id: Date.now(),
          url: imageUrl,
          prompt: currentSet.prompt,
          createdAt: new Date().toISOString(),
          originalImage: originalImage
        };

        // If this is a modification, save the original to pre-images
        if (originalImage) {
          const preImagesFolder = {
            ...folder,
            preImages: [...(folder.preImages || []), originalImage]
          };
          return {
            ...preImagesFolder,
            images: [...folder.images, imageData]
          };
        }

        return {
          ...folder,
          images: [...folder.images, imageData]
        };
      }
      return folder;
    });

    setFolders(updatedFolders);
  };

  const generateImages = async () => {
    if (!transcript.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // First translate the text to English if needed
      let englishPrompt = transcript;
      if (language !== 'en-IN') {
        englishPrompt = await translateText(transcript);
      }

      // Generate 3 images using ClipDrop API
      const imagePromises = Array(3).fill().map(async () => {
        const form = new FormData();
        form.append('prompt', englishPrompt);

        const response = await fetch('https://clipdrop-api.co/text-to-image/v1', {
          method: 'POST',
          headers: {
            'x-api-key': CLIPDROP_API_KEY,
          },
          body: form,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        return URL.createObjectURL(new Blob([buffer], { type: 'image/png' }));
      });

      const imageUrls = await Promise.all(imagePromises);
      
      const newImages = imageUrls.map((url, index) => ({
        url: url,
        prompt: englishPrompt,
        originalPrompt: transcript,
        timestamp: new Date().toLocaleString()
      }));

      const newSet = {
        id: Date.now(),
        prompt: englishPrompt,
        originalPrompt: transcript,
        images: newImages,
        timestamp: new Date().toLocaleString()
      };

      setImageSets(prev => [...prev, newSet]);
      setCurrentSetIndex(imageSets.length);
      setTranscript('');

    } catch (err) {
      console.error('Generation error:', err);
      setError(`Image generation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!transcript) {
      alert('Please provide a prompt by speaking.');
      return;
    }

    if (selectedImageIndex !== null) {
      await generateImages(transcript, true, selectedImageIndex);
    } else {
      await generateImages(transcript);
    }
    SpeechRecognition.stopListening();
    setIsListening(false);
    resetTranscript();
    setSelectedImageIndex(null);
  };

  const startListening = () => {
    SpeechRecognition.startListening({ 
      continuous: true,
      language: language
    });
    setIsListening(true);
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    setIsListening(false);
  };

  const downloadImage = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated_image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveImage = (url) => {
    if (!savedImages.includes(url)) {
      setSavedImages([...savedImages, url]);
    }
  };

  const handleImageClick = (index) => {
    setSelectedImageForModification(currentSet.images[index]);
    setSelectedImageIndex(index);
  };

  const goBack = () => {
    if (currentSetIndex > 0) {
      setCurrentSetIndex(currentSetIndex - 1);
    }
  };

  const goForward = () => {
    if (currentSetIndex < imageSets.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1);
    }
  };

  const deleteHistoryItem = (id) => {
    if (imageSets.length <= 1) return;

    const newSets = imageSets.filter(set => set.id !== id);
    setImageSets(newSets);

    if (currentSetIndex >= newSets.length) {
      setCurrentSetIndex(newSets.length - 1);
    }
  };

  const toggleLanguage = () => {
    const languages = ['en-IN', 'hi-IN', 'te-IN'];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex]);
  };

  if (!browserSupportsSpeechRecognition) {
    return <div className="error">Your browser does not support speech recognition.</div>;
  }

  return (
    <div className="App bright-theme">
      <button className="history-toggle" onClick={() => setShowHistory(!showHistory)}>
        {showHistory ? 'Hide History' : 'Show History'}
      </button>

      <div className={`history-sidebar ${showHistory ? 'open' : ''}`}>
        <h3>Generation History</h3>
        <ul>
          {imageSets.map((set, idx) => (
            <li key={set.id} className={currentSetIndex === idx ? 'active' : ''}>
              <button onClick={() => setCurrentSetIndex(idx)}>
                {set.prompt.substring(0, 30)}{set.prompt.length > 30 ? '...' : ''}
                <span className="lang-tag">{set.language}</span>
              </button>
              <button className="delete-history" onClick={(e) => {
                e.stopPropagation();
                deleteHistoryItem(set.id);
              }}>×</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="main-content">
        <h1 className="main-title">Sound Pix <span className="gradient-text">Voice to Image</span></h1>
        <p>Describe your image verbally, then generate visual magic</p>

        {/* Folder Management */}
        <div className="folder-management">
          <h3>Image Folders</h3>
          <div className="folder-controls">
            <button onClick={() => setShowFolderInput(!showFolderInput)}>
              <i className="fas fa-plus"></i> Create Folder
            </button>
            {showFolderInput && (
              <div className="folder-input">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                />
                <button onClick={createFolder}>Create</button>
                <button onClick={() => setShowFolderInput(false)}>Cancel</button>
              </div>
            )}
          </div>
          <div className="folders-list">
            {folders.map(folder => (
              <div key={folder.id} className="folder-item">
                <span>{folder.name} ({folder.images.length} images)</span>
                <button onClick={() => setCurrentFolder(folder)}>
                  <i className="fas fa-eye"></i> View
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="language-toggle">
          <button onClick={toggleLanguage}>
            <i className="fas fa-globe"></i> Switch Language: 
            {language === 'en-IN' ? ' English' : 
             language === 'hi-IN' ? ' हिंदी' : 
             language === 'te-IN' ? ' తెలుగు' : 'English'}
          </button>
        </div>

        <div className="voice-container">
          <div className={`voice-animation ${isListening ? 'active' : ''}`}>
            <div className="wave"></div>
            <div className="wave"></div>
            <div className="wave"></div>
            <div className="mic-icon">
              <i className="fas fa-microphone"></i>
            </div>
          </div>

          <div className="transcript-box">
            {isTranslating ? 'Translating...' : 
             transcript || (isListening ? 'Listening...' : 'Your description will appear here')}
            {transcript && (
              <div className="transcript-info">
                <small>Language: {language} | Length: {transcript.length} chars</small>
              </div>
            )}
          </div>
        </div>

        <div className="controls">
          <button 
            onClick={isListening ? stopListening : startListening} 
            className={`voice-button ${isListening ? 'listening' : ''}`}
          >
            <i className={`fas fa-${isListening ? 'microphone-slash' : 'microphone'}`}></i>
            {isListening ? 'Stop Speaking' : 'Start Speaking'}
          </button>

          <button 
            onClick={handleGenerate} 
            disabled={isLoading || isTranslating || (!transcript && !isListening)}
            className="generate-button"
          >
            <i className="fas fa-magic"></i> Generate Images
          </button>

          <button onClick={resetTranscript} disabled={isLoading || isTranslating}>
            <i className="fas fa-eraser"></i> Clear
          </button>
        </div>

        <div className="navigation">
          <button onClick={goBack} disabled={currentSetIndex === 0}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <span>Prompt: {currentSet.prompt.substring(0, 50)}{currentSet.prompt.length > 50 ? '...' : ''}</span>
          <button onClick={goForward} disabled={currentSetIndex === imageSets.length - 1}>
            Next <i className="fas fa-arrow-right"></i>
          </button>
        </div>

        <div className="images-container">
          {currentSet.images.map((url, index) => (
            url ? (
              <div 
                key={index} 
                className={`image-card ${selectedImageIndex === index ? 'selected' : ''}`}
                onClick={() => handleImageClick(index)}
              >
                <img src={url} alt={`Generated ${index}`} />
                <div className="image-actions">
                  <button onClick={(e) => { e.stopPropagation(); downloadImage(url); }}>
                    <i className="fas fa-download"></i>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); saveImage(url); }}>
                    <i className="fas fa-save"></i>
                  </button>
                  {folders.length > 0 && (
                    <select onChange={(e) => {
                      e.stopPropagation();
                      const folderId = parseInt(e.target.value);
                      if (folderId) {
                        const originalImage = selectedImageForModification === url ? 
                          currentSet.originalImage : null;
                        saveImageToFolder(url, folderId, originalImage);
                      }
                    }}>
                      <option value="">Save to folder...</option>
                      {folders.map(folder => (
                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : (
              <div key={index} className="image-card placeholder">
                <div className={`loading-placeholder ${isLoading ? 'active' : ''}`}>
                  {isLoading ? <div className="spinner"></div> : 'Image will appear here'}
                </div>
              </div>
            )
          ))}
        </div>

        {selectedImageIndex !== null && (
          <div className="selected-prompt">
            <h3>
              <i className="fas fa-mouse-pointer"></i> Selected Image {selectedImageIndex + 1}
            </h3>
            <p>Speak a new description to transform this image</p>
          </div>
        )}

        {currentSetIndex > 0 && (
          <div className="regenerated-section">
            <h2><i className="fas fa-sync-alt"></i> Regenerated From Previous</h2>
            <div className="images-container">
              {imageSets[currentSetIndex - 1].images.map((url, index) => (
                url && (
                  <div key={index} className="image-card">
                    <img src={url} alt={`Previous ${index}`} />
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Folder View Modal */}
        {currentFolder && (
          <div className="folder-modal">
            <div className="folder-modal-content">
              <div className="folder-modal-header">
                <h2>{currentFolder.name}</h2>
                <button onClick={() => setCurrentFolder(null)}>×</button>
              </div>
              <div className="folder-images">
                {currentFolder.images.map((image, index) => (
                  <div key={image.id} className="folder-image">
                    <img src={image.url} alt={`${currentFolder.name} ${index}`} />
                    <p>{image.prompt}</p>
                    <div className="image-actions">
                      <button onClick={() => downloadImage(image.url)}>
                        <i className="fas fa-download"></i>
                      </button>
                    </div>
                  </div>
                ))}
                {currentFolder.preImages && currentFolder.preImages.length > 0 && (
                  <div className="pre-images-section">
                    <h4>Pre-Images (Modified Versions)</h4>
                    {currentFolder.preImages.map((image, index) => (
                      <div key={index} className="folder-image">
                        <img src={image.url} alt={`Pre-image ${index}`} />
                        <p>{image.prompt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {savedImages.length > 0 && (
          <div className="saved-section">
            <h2><i className="fas fa-bookmark"></i> Saved Images</h2>
            <div className="saved-images">
              {savedImages.map((url, index) => (
                <div key={index} className="saved-image">
                  <img src={url} alt={`Saved ${index}`} />
                  <button onClick={() => downloadImage(url)}>
                    <i className="fas fa-download"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(isLoading || isTranslating) && (
          <div className="loading">
            <div className="spinner"></div>
            <p>{isTranslating ? 'Translating your prompt...' : 'Creating your images...'}</p>
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
};

export default VoiceToImage;