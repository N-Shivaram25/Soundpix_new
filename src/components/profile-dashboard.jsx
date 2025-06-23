
import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from '../contexts/AuthContext';

const ProfileDashboard = () => {
  const { user } = useAuth();
  const [userFolders, setUserFolders] = useState([]);
  const [stats, setStats] = useState({
    totalImages: 0,
    totalVideos: 0,
    totalCharacters: 0,
    totalStories: 0
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Load user folders from Supabase
      const { data: folders, error } = await supabase
        .from('user_folders')
        .select('*')
        .eq('user_id', user.id);

      if (!error) {
        setUserFolders(folders || []);
        
        // Calculate stats
        const totalImages = folders?.reduce((sum, folder) => sum + (folder.image_count || 0), 0) || 0;
        setStats(prev => ({ ...prev, totalImages }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const createNewFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      const { data, error } = await supabase
        .from('user_folders')
        .insert([
          {
            user_id: user.id,
            name: folderName,
            created_at: new Date().toISOString()
          }
        ]);

      if (!error) {
        loadUserData();
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  return (
    <div className="profile-dashboard">
      <div className="profile-header">
        <h1>Profile Dashboard</h1>
        <div className="user-info">
          <p>Welcome back, {user?.email}</p>
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.totalImages}</h3>
          <p>Total Images</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalVideos}</h3>
          <p>Total Videos</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalCharacters}</h3>
          <p>Characters Created</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalStories}</h3>
          <p>Stories Generated</p>
        </div>
      </div>
      
      <div className="folders-section">
        <div className="section-header">
          <h2>Your Folders</h2>
          <button onClick={createNewFolder} className="create-folder-btn">
            Create New Folder
          </button>
        </div>
        
        <div className="folders-grid">
          {userFolders.map((folder) => (
            <div key={folder.id} className="folder-card">
              <h3>{folder.name}</h3>
              <p>{folder.image_count || 0} images</p>
              <div className="folder-actions">
                <button>View</button>
                <button>Manage</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard;
