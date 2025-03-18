import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './ViewInventory.css';

const ViewInventory = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  // Search filters
  const [filters, setFilters] = useState({
    name: '',
    category: '',
    magasin: '',
    lot: '',
    dateFrom: '',
    dateTo: '',
    dlcFrom: '',
    dlcTo: '',
    minQuantity: '',
    maxQuantity: ''
  });
  
  // Toggle for advanced search
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch inventory data
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'Ingredients'));
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(items);
      setFilteredItems(items);
    } catch (err) {
      console.error("Error fetching data: ", err);
      setError("Une erreur s'est produite lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Apply filters when filters or inventory changes
  useEffect(() => {
    if (inventory.length > 0) {
      applyFilters();
    }
  }, [filters, inventory]);

  // Update an item
  const updateItem = async (item) => {
    try {
      const itemRef = doc(db, 'Ingredients', item.id);
      const { id, ...itemData } = item;
      await updateDoc(itemRef, itemData);
      fetchInventory();
    } catch (err) {
      console.error("Error updating item: ", err);
      setError("Une erreur s'est produite lors de la mise à jour de l'article.");
    }
  };

  // Delete an item
  const deleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, 'Ingredients', id));
      fetchInventory();
    } catch (err) {
      console.error("Error deleting item: ", err);
      setError("Une erreur s'est produite lors de la suppression de l'article.");
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
  };

  // Filter function
  const applyFilters = () => {
    const result = inventory.filter(item => {
      // Name filter
      if (filters.name && !item.name?.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (filters.category && item.category !== filters.category) {
        return false;
      }
      
      // Magasin filter
      if (filters.magasin && !item.magasin?.toLowerCase().includes(filters.magasin.toLowerCase())) {
        return false;
      }
      
      // Lot filter
      if (filters.lot && !item.lot?.toLowerCase().includes(filters.lot.toLowerCase())) {
        return false;
      }
      
      // Date range filter
      if (filters.dateFrom && new Date(item.date) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(item.date) > new Date(filters.dateTo)) {
        return false;
      }
      
      // DLC range filter
      if (filters.dlcFrom && new Date(item.dlc) < new Date(filters.dlcFrom)) {
        return false;
      }
      if (filters.dlcTo && new Date(item.dlc) > new Date(filters.dlcTo)) {
        return false;
      }
      
      // Quantity range filter
      if (filters.minQuantity && item.quantity < parseFloat(filters.minQuantity)) {
        return false;
      }
      if (filters.maxQuantity && item.quantity > parseFloat(filters.maxQuantity)) {
        return false;
      }
      
      return true;
    });
    
    setFilteredItems(result);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      name: '',
      category: '',
      magasin: '',
      lot: '',
      dateFrom: '',
      dateTo: '',
      dlcFrom: '',
      dlcTo: '',
      minQuantity: '',
      maxQuantity: ''
    });
  };

  // Edit item functions
  const handleEdit = (item) => {
    setEditingItem(item.id);
    setEditFormData({ ...item });
  };

  const handleEditChange = (e) => {
    const { name, value, type } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    });
  };

  const handleSaveEdit = () => {
    updateItem(editFormData);
    setEditingItem(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article?')) {
      deleteItem(id);
    }
  };

  // Dashboard calculations
  const lowStockItems = filteredItems.filter(item => 
    item.quantity <= item.minimumThreshold && item.minimumThreshold > 0
  ).length;

  const categories = new Set(filteredItems.map(item => item.category).filter(Boolean));

  return (
    <div className="inventory-management">
      <h1>Gestion d'Inventaire</h1>
      
      <div className="action-bar">
        <button 
          className="btn-return" 
          onClick={() => navigate('/')}
        >
          ← Retour à l'Accueil
        </button>
      </div>

      <div className="dashboard">
        <div className="dashboard-card">
          <h3>Articles Totaux</h3>
          <div className="dashboard-value">{filteredItems.length}</div>
        </div>

        <div className={`dashboard-card ${lowStockItems > 0 ? 'warning' : ''}`}>
          <h3>Stock Bas</h3>
          <div className="dashboard-value">{lowStockItems}</div>
        </div>

        <div className="dashboard-card">
          <h3>Catégories</h3>
          <div className="dashboard-value">{categories.size}</div>
        </div>
      </div>

      <div className="search-panel">
        <h2>Recherche</h2>
        <div className="search-form">
          <div className="search-row">
            <div className="search-field">
              <label htmlFor="name">Nom</label>
              <input
                type="text"
                id="name"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                placeholder="Rechercher par nom..."
              />
            </div>
            
            <div className="search-field">
              <label htmlFor="category">Catégorie</label>
              <select
                id="category"
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
              >
                <option value="">Toutes les catégories</option>
                <option value="Matière Première">Matière Première</option>
                <option value="Article">Article fini</option>
                <option value="Emballage">Emballage</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            
            <div className="search-field">
              <label htmlFor="magasin">Magasin / Entrepôt</label>
              <input
                type="text"
                id="magasin"
                name="magasin"
                value={filters.magasin}
                onChange={handleFilterChange}
                placeholder="Emplacement..."
              />
            </div>
          </div>
          
          <div className="toggle-advanced">
            <button 
              type="button" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="toggle-btn"
            >
              {showAdvanced ? "Masquer les filtres avancés" : "Afficher les filtres avancés"}
            </button>
          </div>

          {showAdvanced && (
            <div className="advanced-filters">
              <div className="search-row">
                <div className="search-field">
                  <label htmlFor="lot">Numéro de Lot</label>
                  <input
                    type="text"
                    id="lot"
                    name="lot"
                    value={filters.lot}
                    onChange={handleFilterChange}
                    placeholder="Numéro de lot..."
                  />
                </div>
                
                <div className="search-field date-range">
                  <label>Date d'Entrée</label>
                  <div className="date-inputs">
                    <input
                      type="date"
                      name="dateFrom"
                      value={filters.dateFrom}
                      onChange={handleFilterChange}
                    />
                    <span>à</span>
                    <input
                      type="date"
                      name="dateTo"
                      value={filters.dateTo}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="search-row">
                <div className="search-field date-range">
                  <label>Date d'Expiration</label>
                  <div className="date-inputs">
                    <input
                      type="date"
                      name="dlcFrom"
                      value={filters.dlcFrom}
                      onChange={handleFilterChange}
                    />
                    <span>à</span>
                    <input
                      type="date"
                      name="dlcTo"
                      value={filters.dlcTo}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
                
                <div className="search-field quantity-range">
                  <label>Quantité</label>
                  <div className="quantity-inputs">
                    <input
                      type="number"
                      name="minQuantity"
                      value={filters.minQuantity}
                      onChange={handleFilterChange}
                      placeholder="Min"
                      min="0"
                      step="0.01"
                    />
                    <span>à</span>
                    <input
                      type="number"
                      name="maxQuantity"
                      value={filters.maxQuantity}
                      onChange={handleFilterChange}
                      placeholder="Max"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="filter-actions">
            <button 
              type="button" 
              className="clear-btn"
              onClick={handleClearFilters}
            >
              Effacer les filtres
            </button>
          </div>
        </div>
      </div>

      <div className="inventory-list">
        <h2>Inventaire {filteredItems.length > 0 ? `(${filteredItems.length} articles)` : ''}</h2>
        
        {loading ? (
          <div className="loading">Chargement des données...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="no-results">Aucun article ne correspond à vos critères de recherche.</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Quantité</th>
                  <th>Unité</th>
                  <th>Catégorie</th>
                  <th>Magasin</th>
                  <th>Seuil Min.</th>
                  <th>Lot</th>
                  <th>Date d'Entrée</th>
                  <th>DLC</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className={item.quantity <= item.minimumThreshold && item.minimumThreshold > 0 ? 'low-stock' : ''}>
                    {editingItem === item.id ? (
                      // Edit mode
                      <>
                        <td>
                          <input
                            type="text"
                            name="name"
                            value={editFormData.name || ''}
                            onChange={handleEditChange}
                            className="form-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            name="quantity"
                            value={editFormData.quantity || 0}
                            onChange={handleEditChange}
                            className="form-input"
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td>
                          <select
                            name="unit"
                            value={editFormData.unit || ''}
                            onChange={handleEditChange}
                            className="form-select"
                          >
                            <option value="kg">Kilogramme (kg)</option>
                            <option value="g">Gramme (g)</option>
                            <option value="l">Litre (l)</option>
                            <option value="ml">Millilitre (ml)</option>
                            <option value="pcs">Pièce(s)</option>
                            <option value="carton">Carton</option>
                          </select>
                        </td>
                        <td>
                          <select
                            name="category"
                            value={editFormData.category || ''}
                            onChange={handleEditChange}
                            className="form-select"
                          >
                            <option value="">Aucune</option>
                            <option value="Matière Première">Matière première</option>
                            <option value="Article">Article fini</option>
                            <option value="Emballage">Emballage</option>
                            <option value="Autre">Autre</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            name="magasin"
                            value={editFormData.magasin || ''}
                            onChange={handleEditChange}
                            className="form-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            name="minimumThreshold"
                            value={editFormData.minimumThreshold || 0}
                            onChange={handleEditChange}
                        className="form-input"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="lot"
                        value={editFormData.lot || ''}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        name="date"
                        value={editFormData.date || ''}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        name="dlc"
                        value={editFormData.dlc || ''}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={handleSaveEdit}
                          className="btn-save"
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn-cancel"
                        >
                          Annuler
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // View mode
                  <>
                    <td>{item.name}</td>
                    <td className={item.quantity <= item.minimumThreshold && item.minimumThreshold > 0 ? 'low-quantity' : ''}>
                      {item.quantity}
                    </td>
                    <td>{item.unit}</td>
                    <td>{item.category}</td>
                    <td>{item.magasin}</td>
                    <td>{item.minimumThreshold}</td>
                    <td>{item.lot}</td>
                    <td>{item.date ? new Date(item.date).toLocaleDateString() : ''}</td>
                    <td>{item.dlc ? new Date(item.dlc).toLocaleDateString() : ''}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(item)}
                          className="btn-edit"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="btn-delete"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
</div>
);
};
export default ViewInventory;