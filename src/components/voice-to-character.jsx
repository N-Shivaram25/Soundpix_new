
import React, { useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const VoiceToCharacter = () => {
  const [characters, setCharacters] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [language, setLanguage] = useState('en-IN');
  
  const { transcript, resetTranscript } = useSpeechRecognition();
  const CLIPDROP_API_KEY = 'ed15928b91fc7021dfe4d2164e6b2c05a9454cba4664adb32d266eea4d80c92d5c385feb240d5815f8f4e56e70397367';

  const generateCharacter = async () => {
    if (!transcript) return;

    setIsGenerating(true);
    
    try {
      const form = new FormData();
      form.append('prompt', `Character portrait: ${transcript}`);

      const response = await fetch('https://clipdrop-api.co/text-to-image/v1', {
        method: 'POST',
        headers: { 'x-api-key': CLIPDROP_API_KEY },
        body: form,
      });

      if (!response.ok) {
        throw new Error('Failed to generate character');
      }

      const buffer = await response.arrayBuffer();
      const imageUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/png' }));
      
      const newCharacter = {
        id: Date.now(),
        description: transcript,
        imageUrl,
        name: `Character ${characters.length + 1}`,
        createdAt: new Date().toISOString()
      };
      
      setCharacters([...characters, newCharacter]);
      resetTranscript();
    } catch (error) {
      console.error('Error generating character:', error);
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
    <div className="voice-to-character">
      <h1>Voice to Character Mode</h1>
      <p>Describe a character and watch them come to life</p>
      
      <div className="character-controls">
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
            {isListening ? 'Stop Describing' : 'Describe Character'}
          </button>
          
          <button 
            onClick={generateCharacter}
            disabled={!transcript || isGenerating}
            className="generate-btn"
          >
            {isGenerating ? 'Creating Character...' : 'Generate Character'}
          </button>
          
          <button onClick={resetTranscript}>Clear</button>
        </div>
      </div>
      
      <div className="character-transcript">
        <h3>Character Description:</h3>
        <div className="transcript-box">
          {transcript || (isListening ? 'Listening...' : 'Describe your character here')}
        </div>
      </div>
      
      <div className="characters-gallery">
        <h3>Your Characters:</h3>
        <div className="characters-grid">
          {characters.map((character) => (
            <div key={character.id} className="character-card">
              <img src={character.imageUrl} alt={character.name} />
              <div className="character-info">
                <h4>{character.name}</h4>
                <p>{character.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceToCharacter;
