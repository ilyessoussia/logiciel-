import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import './Login.css';

const Login = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!username || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create a query to find the user with the given username
      const q = query(collection(db, "Users"), where("username", "==", username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError("Nom d'utilisateur ou mot de passe incorrect");
        setLoading(false);
        return;
      }
      
      // Check if password matches
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      if (userData.password === password) {
        // Store authentication in sessionStorage instead of localStorage
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('userId', userDoc.id);
        sessionStorage.setItem('userName', userData.username);
        setIsAuthenticated(true);
        navigate('/');
      } else {
        setError("Nom d'utilisateur ou mot de passe incorrect");
      }
    } catch (error) {
      console.error("Error during login:", error);
      setError("Une erreur est survenue lors de la connexion");
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Connexion</h2>
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYTbryE-wHbSGZsEPNSiGcIUB948GryyD4bw&s" alt="Login Illustration" className="login-image" />

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom d'utilisateur"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              disabled={loading}
            />
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;