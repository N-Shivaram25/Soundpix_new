import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../App.css';

const VoiceToImage = () => {
  const [imageSets, setImageSets] = useState([{id: 0, images: [null, null, null], prompt: '', language: 'en-IN'}]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [savedImages, setSavedImages] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [language, setLanguage] = useState('en-IN');
  
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({
    transcribing: true,
    clearTranscriptOnListen: false
  });
  
  const currentSet = imageSets[currentSetIndex];
  const CLIPDROP_API_KEY = 'ed15928b91fc7021dfe4d2164e6b2c05a9454cba4664adb32d266eea4d80c92d5c385feb240d5815f8f4e56e70397367';

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
  }, []);

  const generateImages = async (prompt, isRegeneration = false, selectedIdx = null) => {
    if (!prompt) {
      setError('Please provide a description to generate images.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const form = new FormData();
    form.append('prompt', prompt);

    try {
      const responses = await Promise.all([
        fetch('https://clipdrop-api.co/text-to-image/v1', {
          method: 'POST',
          headers: { 'x-api-key': CLIPDROP_API_KEY },
          body: form,
        }),
        fetch('https://clipdrop-api.co/text-to-image/v1', {
          method: 'POST',
          headers: { 'x-api-key': CLIPDROP_API_KEY },
          body: form,
        }),
        fetch('https://clipdrop-api.co/text-to-image/v1', {
          method: 'POST',
          headers: { 'x-api-key': CLIPDROP_API_KEY },
          body: form,
        }),
      ]);

      if (!responses.every(response => response.ok)) {
        throw new Error('Failed to generate images. Check your API key or credits.');
      }

      const buffers = await Promise.all(responses.map(response => response.arrayBuffer()));
      const newImageUrls = buffers.map(buffer => URL.createObjectURL(new Blob([buffer], { type: 'image/png' })));
      
      if (isRegeneration && selectedIdx !== null) {
        // Create a new set for regeneration
        const newSet = {
          id: imageSets.length,
          images: [...currentSet.images],
          prompt: `${currentSet.prompt} → ${prompt}`,
          language
        };
        newSet.images[selectedIdx] = newImageUrls[0];
        
        setImageSets([...imageSets, newSet]);
        setCurrentSetIndex(imageSets.length);
      } else {
        // Create a new set for initial generation
        const newSet = {
          id: imageSets.length,
          images: newImageUrls,
          prompt: prompt,
          language
        };
        
        setImageSets([...imageSets, newSet]);
        setCurrentSetIndex(imageSets.length);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!transcript) {
      alert('Please provide a prompt by speaking.');
      return;
    }
    
    if (selectedImageIndex !== null) {
      generateImages(transcript, true, selectedImageIndex);
    } else {
      generateImages(transcript);
    }
    SpeechRecognition.stopListening();
    setIsListening(false);
    resetTranscript();
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
            {transcript || (isListening ? 'Listening...' : 'Your description will appear here')}
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
            disabled={isLoading || (!transcript && !isListening)}
            className="generate-button"
          >
            <i className="fas fa-magic"></i> Generate Images
          </button>
          
          <button onClick={resetTranscript} disabled={isLoading}>
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
                onClick={() => setSelectedImageIndex(index)}
              >
                <img src={url} alt={`Generated ${index}`} />
                <div className="image-actions">
                  <button onClick={() => downloadImage(url)}>
                    <i className="fas fa-download"></i>
                  </button>
                  <button onClick={() => saveImage(url)}>
                    <i className="fas fa-save"></i>
                  </button>
                </div>
              </div>
            ) : (
              <div key={index} className="image-card placeholder">
                {isLoading ? 'Generating...' : 'Image will appear here'}
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

        {isLoading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Creating your images...</p>
          </div>
        )}
        
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
};

export default VoiceToImage;