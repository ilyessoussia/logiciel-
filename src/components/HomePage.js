import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css'; // Import the CSS file

const HomePage = () => {
  return (
    <div className="home-page-container">
      <div className="home-page">
        <div className="header-container">
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYTbryE-wHbSGZsEPNSiGcIUB948GryyD4bw&s" alt="Inventory System Logo" className="logo-image" />
          <h1 className="home-title">Système de Gestion d'Inventaire</h1>
        </div>
        
        <div className="menu-grid">
          <Link to="/add-item" className="menu-item">
            <i className="fas fa-plus-circle"></i>
            <h3>Ajouter un Article</h3>
            <p>Ajouter de nouveaux articles à l'inventaire</p>
          </Link>
          
          <Link to="/view-inventory" className="menu-item">
            <i className="fas fa-warehouse"></i>
            <h3>Voir l'Inventaire</h3>
            <p>Afficher et gérer les articles en stock</p>
          </Link>
          
          <Link to="/create-recipe" className="menu-item">
            <i className="fas fa-utensils"></i>
            <h3>Créer une Recette</h3>
            <p>Définir et exécuter des recettes</p>
          </Link>

          <Link to="/sales" className="menu-item">
            <i className="fas fa-cash-register"></i>
            <h3>Vente des Articles</h3>
            <p>Enregistrer les ventes et suivre l'historique des transactions.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;