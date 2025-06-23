
import React, { useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import RunwayML from '@runwayml/sdk';

const VoiceToVideo = () => {
  const [videos, setVideos] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [language, setLanguage] = useState('en-IN');
  
  const { transcript, resetTranscript } = useSpeechRecognition();
  
  // Initialize Runway ML client
  const runway = new RunwayML({
    apiKey: process.env.REACT_APP_RUNWAYML_API_KEY || 'your-runway-api-key'
  });

  const generateVideo = async () => {
    if (!transcript) return;

    setIsGenerating(true);
    
    try {
      // Generate video using Runway ML
      const task = await runway.imageToVideo.create({
        promptText: transcript,
        model: 'gen3a_turbo'
      });
      
      // Poll for completion
      let result = await runway.tasks.retrieve(task.id);
      
      while (result.status === 'PENDING' || result.status === 'RUNNING') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = await runway.tasks.retrieve(task.id);
      }
      
      if (result.status === 'SUCCEEDED') {
        const newVideo = {
          id: Date.now(),
          prompt: transcript,
          videoUrl: result.output[0],
          createdAt: new Date().toISOString()
        };
        
        setVideos([...videos, newVideo]);
        resetTranscript();
      }
    } catch (error) {
      console.error('Error generating video:', error);
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
    <div className="voice-to-video">
      <h1>Voice to Video Generation</h1>
      <p>Describe a scene and generate AI-powered videos</p>
      
      <div className="video-controls">
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
            {isListening ? 'Stop Recording' : 'Describe Scene'}
          </button>
          
          <button 
            onClick={generateVideo}
            disabled={!transcript || isGenerating}
            className="generate-btn"
          >
            {isGenerating ? 'Generating Video...' : 'Generate Video'}
          </button>
          
          <button onClick={resetTranscript}>Clear</button>
        </div>
      </div>
      
      <div className="video-transcript">
        <h3>Video Description:</h3>
        <div className="transcript-box">
          {transcript || (isListening ? 'Listening...' : 'Describe your video scene here')}
        </div>
      </div>
      
      <div className="videos-gallery">
        <h3>Generated Videos:</h3>
        <div className="videos-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card">
              <video controls>
                <source src={video.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="video-info">
                <p>{video.prompt}</p>
                <small>{new Date(video.createdAt).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceToVideo;
