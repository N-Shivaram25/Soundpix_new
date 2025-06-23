
import React, { useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useAuth } from '../contexts/AuthContext';

const VoiceToStory = () => {
  const [storySegments, setStorySegments] = useState([]);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [language, setLanguage] = useState('en-IN');
  
  const { transcript, resetTranscript } = useSpeechRecognition();
  const { user } = useAuth();

  const CLIPDROP_API_KEY = 'ed15928b91fc7021dfe4d2164e6b2c05a9454cba4664adb32d266eea4d80c92d5c385feb240d5815f8f4e56e70397367';

  const splitStoryIntoSegments = (story) => {
    // Split story by sentences or paragraphs
    const segments = story.split(/[.!?]+/).filter(segment => segment.trim().length > 0);
    return segments.map(segment => segment.trim());
  };

  const generateImageForSegment = async (segment) => {
    const form = new FormData();
    form.append('prompt', segment);

    const response = await fetch('https://clipdrop-api.co/text-to-image/v1', {
      method: 'POST',
      headers: { 'x-api-key': CLIPDROP_API_KEY },
      body: form,
    });

    if (!response.ok) {
      throw new Error('Failed to generate image');
    }

    const buffer = await response.arrayBuffer();
    return URL.createObjectURL(new Blob([buffer], { type: 'image/png' }));
  };

  const generateStoryboard = async () => {
    if (!transcript) return;

    setIsGenerating(true);
    const segments = splitStoryIntoSegments(transcript);
    setStorySegments(segments);

    try {
      const images = await Promise.all(
        segments.map(segment => generateImageForSegment(segment))
      );
      setGeneratedImages(images);
    } catch (error) {
      console.error('Error generating storyboard:', error);
    } finally {
      setIsGenerating(false);
    }
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

  return (
    <div className="voice-to-story">
      <h1>Voice to Story Mode</h1>
      <p>Narrate your story and watch it come to life as a visual storyboard</p>
      
      <div className="story-controls">
        <div className="language-selector">
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en-IN">English</option>
            <option value="hi-IN">हिंदी</option>
            <option value="te-IN">తెలుగు</option>
          </select>
        </div>
        
        <div className="voice-controls">
          <button 
            onClick={isListening ? stopListening : startListening}
            className={`voice-btn ${isListening ? 'listening' : ''}`}
          >
            {isListening ? 'Stop Recording' : 'Start Narrating'}
          </button>
          
          <button 
            onClick={generateStoryboard}
            disabled={!transcript || isGenerating}
            className="generate-btn"
          >
            {isGenerating ? 'Generating Storyboard...' : 'Create Storyboard'}
          </button>
          
          <button onClick={resetTranscript}>Clear</button>
        </div>
      </div>
      
      <div className="story-transcript">
        <h3>Your Story:</h3>
        <div className="transcript-box">
          {transcript || (isListening ? 'Listening...' : 'Your story will appear here')}
        </div>
      </div>
      
      {storySegments.length > 0 && (
        <div className="story-segments">
          <h3>Story Segments:</h3>
          {storySegments.map((segment, index) => (
            <div key={index} className="segment-card">
              <div className="segment-text">{segment}</div>
              {generatedImages[index] && (
                <img src={generatedImages[index]} alt={`Scene ${index + 1}`} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VoiceToStory;
