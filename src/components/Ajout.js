import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import './Ajout.css';

const AddItem = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  const [item, setItem] = useState({
    name: '',
    quantity: '',
    unit: '',
    category: 'Matière Première',
    magasin: '',
    minimumThreshold: 0,
    lot: '',
    date: today,
    dt: today,
    dlc: '',
    notes: '',
  });

  const [itemsList, setItemsList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      const querySnapshot = await getDocs(collection(db, 'Ingredients'));
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItemsList(items);
    };

    fetchItems();
  }, []);


  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setItem({
      ...item,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      await addDoc(collection(db, "Ingredients"), item);
      alert("Article ajouté avec succès!"); // Show success message
      handleClear(); // Reset form fields
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Erreur lors de l'ajout de l'article."); // Show error message if needed
    }
  };

  const handleClear = () => {
    setItem({
      name: '',
      quantity: '',
      unit: '',
      category: 'Matière Première',
      magasin: '',
      minimumThreshold: 0,
      lot: '',
      date: today,
      dt: today,
      dlc: '',
      notes: '',
    });
  };

  const handleDuplicate = (selectedItem) => {
    const { id, ...itemWithoutId } = selectedItem; // Remove id
    setItem(itemWithoutId);
    setShowDropdown(false);
  };


  return (
    <div className="add-item-container">
    <div className="form-card">
      <div className="form-header">
        <h2>Ajouter un Nouvel Article</h2>
        <button 
          type="button" 
          className="duplicate-btn"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span className="icon">📋</span>
          Dupliquer un article
        </button>

          {showDropdown && (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Choisissez un article à dupliquer</h3>
        <ul>
          {itemsList.map((item) => (
            <li key={item.id} onClick={() => handleDuplicate(item)}>
              {item.name}
            </li>
          ))}
        </ul>
        <button onClick={() => setShowDropdown(false)}>Fermer</button>
      </div>
    </div>
  )}
      </div>
      
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="name">
                  Nom <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={item.name}
                  onChange={handleChange}
                  placeholder="Nom de l'article"
                  required
                />
              </div>
            </div>
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="quantity">
                  Quantité <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={item.quantity}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="unit">
                  Unité <span className="required">*</span>
                </label>
                <select
                  id="unit"
                  name="unit"
                  value={item.unit}
                  onChange={handleChange}
                  required
                >
                  <option value="">Sélectionnez une unité</option>
                  <option value="kg">Kilogramme (kg)</option>
                  <option value="g">Gramme (g)</option>
                  <option value="l">Litre (l)</option>
                  <option value="ml">Millilitre (ml)</option>
                  <option value="pcs">Pièce(s)</option>
                  <option value="carton">Carton</option>
                </select>
              </div>
            </div>
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="category">Catégorie</label>
                <select
                  id="category"
                  name="category"
                  value={item.category}
                  onChange={handleChange}
                >
                  <option value="Matière Première">Matière Première</option>
                  <option value="Article">Article fini</option>
                  <option value="Emballage">Emballage</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="magasin">Magasin / Entrepôt</label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    id="magasin"
                    name="magasin"
                    value={item.magasin}
                    onChange={handleChange}
                    placeholder="Localisation de l'article"
                  />
                </div>
              </div>
            </div>
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="minimumThreshold">Seuil Minimum</label>
                <input
                  type="number"
                  id="minimumThreshold"
                  name="minimumThreshold"
                  value={item.minimumThreshold}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="lot">Numéro de Lot</label>
                <input
                  type="text"
                  id="lot"
                  name="lot"
                  value={item.lot}
                  onChange={handleChange}
                  placeholder="Numéro de lot"
                />
              </div>
            </div>
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="date">Date d'Entrée</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={item.date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="dt">
                  Date de Production <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="dt"
                  name="dt"
                  value={item.dt}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="dlc">
                  Date d'Expiration <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="dlc"
                  name="dlc"
                  value={item.dlc}
                  onChange={handleChange}
                  placeholder="jj/mm/aaaa"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={item.notes}
              onChange={handleChange}
              placeholder="Notes supplémentaires sur l'article"
            ></textarea>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => navigate('/')}>
              Retourner
            </button>
            <button type="button" className="btn-clear" onClick={handleClear}>
              Effacer
            </button>
            <button type="submit" className="btn-submit">
              Ajouter l'Article
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItem;