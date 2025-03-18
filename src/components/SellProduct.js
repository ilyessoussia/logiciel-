import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './SellProduct.css';

const SellProduct = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('sell'); // 'sell' or 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [salesHistory, setSalesHistory] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleInfo, setSaleInfo] = useState({
    clientName: '',
    clientContact: '',
    saleDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    notes: ''
  });

  // Fetch products from Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = collection(db, 'Ingredients');
        const productsQuery = query(productsRef, where("category", "==", "Article"));
        const productsSnapshot = await getDocs(productsQuery);
        
        const productsList = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setProducts(productsList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching products: ", err);
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch sales history from Firebase
  useEffect(() => {
    const fetchSalesHistory = async () => {
      if (activeTab !== 'history') return;
      
      try {
        const salesRef = collection(db, 'productSales');
        const salesSnapshot = await getDocs(salesRef);
        
        const salesList = salesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          saleDate: doc.data().saleDate?.toDate() || new Date()
        }));
        
        // Sort by most recent first
        salesList.sort((a, b) => b.saleDate - a.saleDate);
        
        setSalesHistory(salesList);
      } catch (err) {
        console.error("Error fetching sales history: ", err);
      }
    };

    fetchSalesHistory();
  }, [activeTab]);

  // Add product to sale
  const addProduct = (product) => {
    if (!selectedProducts.some(item => item.id === product.id)) {
      setSelectedProducts([...selectedProducts, { 
        ...product, 
        saleQuantity: 0 
      }]);
    }
  };

  // Remove product from sale
  const removeProduct = (id) => {
    setSelectedProducts(selectedProducts.filter(item => item.id !== id));
  };

  // Update sale quantity for product
  const updateSaleQuantity = (id, quantity) => {
    setSelectedProducts(
      selectedProducts.map(product => 
        product.id === id ? { ...product, saleQuantity: quantity } : product
      )
    );
  };

  // Handle sale info change
  const handleSaleInfoChange = (e) => {
    const { name, value } = e.target;
    setSaleInfo({
      ...saleInfo,
      [name]: value
    });
  };

  // Process sale
  const processSale = async () => {
    if (selectedProducts.length === 0) {
      alert("Veuillez sélectionner au moins un produit");
      return;
    }

    if (!saleInfo.clientName.trim()) {
      alert("Veuillez entrer le nom du client");
      return;
    }

    if (!saleInfo.invoiceNumber.trim()) {
      alert("Veuillez entrer un numéro de facture");
      return;
    }

    try {
      // Map products with original and new quantities for historical tracking
      const saleProductsWithHistory = await Promise.all(
        selectedProducts.map(async (product) => {
          if (product.saleQuantity <= 0) {
            return null; // Skip products with no quantity
          }
          
          const productRef = doc(db, 'Ingredients', product.id);
          const productDoc = await getDoc(productRef);
          
          if (productDoc.exists()) {
            const originalQuantity = productDoc.data().quantity;
            
            if (originalQuantity < product.saleQuantity) {
              throw new Error(`Quantité insuffisante pour ${product.name}. Disponible: ${originalQuantity} ${product.unit}`);
            }
            
            const newQuantity = Math.max(0, originalQuantity - product.saleQuantity);
            
            return {
              productId: product.id,
              name: product.name,
              originalQuantity,
              newQuantity,
              soldQuantity: product.saleQuantity,
              unit: product.unit,
              price: product.price || 0
            };
          }
          
          return null;
        })
      );

      // Filter out null products
      const validProducts = saleProductsWithHistory.filter(product => product !== null);
      
      if (validProducts.length === 0) {
        alert("Aucun produit valide pour la vente");
        return;
      }

      // Calculate total
      const total = validProducts.reduce((sum, product) => {
        return sum + (product.price || 0) * product.soldQuantity;
      }, 0);

      // Record sale with historical data
      const saleData = {
        clientName: saleInfo.clientName,
        clientContact: saleInfo.clientContact,
        saleDate: new Date(saleInfo.saleDate),
        invoiceNumber: saleInfo.invoiceNumber,
        notes: saleInfo.notes,
        products: validProducts,
        total: total,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'productSales'), saleData);

      // Update product quantities in database
      for (const product of validProducts) {
        const productRef = doc(db, 'Ingredients', product.productId);
        await updateDoc(productRef, {
          quantity: product.newQuantity
        });
      }

      alert("Vente enregistrée avec succès!");
      
      // Reset form
      setSelectedProducts([]);
      setSaleInfo({
        clientName: '',
        clientContact: '',
        saleDate: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        notes: ''
      });
    } catch (err) {
      console.error("Error processing sale: ", err);
      alert(`Erreur lors de la vente: ${err.message}`);
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Chargement des produits...</div>;
  }

  return (
    <div className="sell-product-container">
  <h1>Vente des Articles</h1>
  
  <div className="action-bar">
    <button 
      className="btn-return" 
      onClick={() => navigate('/')}
    >
      ← Retour à l'Accueil
    </button>
  </div>

  <div className="tabs">
    <div 
      className={`tab ${activeTab === 'sell' ? 'active' : ''}`}
      onClick={() => setActiveTab('sell')}
    >
      Vendre des Produits
    </div>
    <div 
      className={`tab ${activeTab === 'history' ? 'active' : ''}`}
      onClick={() => setActiveTab('history')}
    >
      Historique des Ventes
    </div>
  </div>

  {activeTab === 'sell' && (
    <div className="sale-content">
      <div className="sale-info-panel">
        <div className="panel">
          <h3>Informations de la Vente</h3>
          
          <div className="form-group">
            <label>Client</label>
            <input
              type="text"
              name="clientName"
              value={saleInfo.clientName}
              onChange={handleSaleInfoChange}
              placeholder="Nom du client"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Contact</label>
            <input
              type="text"
              name="clientContact"
              value={saleInfo.clientContact}
              onChange={handleSaleInfoChange}
              placeholder="Téléphone ou email du client"
            />
          </div>
          
          <div className="form-group">
            <label>Date de Vente</label>
            <input
              type="date"
              name="saleDate"
              value={saleInfo.saleDate}
              onChange={handleSaleInfoChange}
            />
          </div>
          
          <div className="form-group">
            <label>Numéro de Facture</label>
            <input
              type="text"
              name="invoiceNumber"
              value={saleInfo.invoiceNumber}
              onChange={handleSaleInfoChange}
              placeholder="Numéro de facture"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={saleInfo.notes}
              onChange={handleSaleInfoChange}
              placeholder="Notes supplémentaires"
              rows="3"
            ></textarea>
          </div>
        </div>
        
        <div className="panel">
          <h3>Articles Sélectionnés</h3>
          
          {selectedProducts.length === 0 ? (
            <p className="no-items">Aucun produit sélectionné</p>
          ) : (
            <div className="table-container">
              <table className="selection-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Disponible</th>
                    <th>Quantité à Vendre</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map(product => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.quantity} {product.unit}</td>
                      <td>
                        <div className="quantity-input">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={product.saleQuantity}
                            onChange={(e) => updateSaleQuantity(
                              product.id, 
                              parseFloat(e.target.value) || 0
                            )}
                            className={product.saleQuantity > product.quantity ? 'error' : ''}
                          />
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn-delete"
                          onClick={() => removeProduct(product.id)}
                        >
                          <i className="trash-icon">🗑️</i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="action-button-container">
            <button 
              className="btn-sale" 
              onClick={processSale}
              disabled={selectedProducts.length === 0}
            >
              Compléter la Vente <i className="sale-icon">💰</i>
            </button>
          </div>
        </div>
      </div>
      
      <div className="panel products-panel">
        <h3>Produits Disponibles</h3>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <i className="search-icon">🔍</i>
        </div>
        
        <div className="table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Quantité Disponible</th>
                <th>Lot</th>
                <th>DLC</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-items">Aucun produit trouvé</td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.quantity} {product.unit}</td>
                    <td>{product.lot || '-'}</td>
                    <td>{product.dlc || '-'}</td>
                    <td>
                      <button
                        className="btn-add"
                        onClick={() => addProduct(product)}
                        disabled={selectedProducts.some(item => item.id === product.id)}
                      >
                        Ajouter <i className="add-icon">+</i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {activeTab === 'history' && (
    <div className="sale-content">
      <div className="panel history-panel">
        <h3>Historique des Ventes</h3>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Rechercher par client ou numéro de facture..."
            value={historySearchTerm}
            onChange={(e) => setHistorySearchTerm(e.target.value)}
            className="search-input"
          />
          <i className="search-icon">🔍</i>
        </div>
        
        {salesHistory.length === 0 ? (
          <p className="no-items">Aucun historique de vente trouvé</p>
        ) : (
          <>
            <div className="table-container">
              <table className="sales-history-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Facture</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory
                    .filter(sale => 
                      sale.clientName?.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                      sale.invoiceNumber?.toLowerCase().includes(historySearchTerm.toLowerCase())
                    )
                    .map(sale => (
                      <tr key={sale.id} className={selectedSale?.id === sale.id ? 'selected-row' : ''}>
                    <td>{sale.clientName}</td>
                    <td>{sale.invoiceNumber}</td>
                    <td>{sale.saleDate.toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => setSelectedSale(sale)}
                      >
                        Détails <i className="view-icon">👁️</i>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        
        {selectedSale && (
          <div className="sale-details panel">
            <div className="sale-details-header">
              <h4>Détails de la Vente: {selectedSale.invoiceNumber}</h4>
              <button
                className="btn-close"
                onClick={() => setSelectedSale(null)}
              >
                <i className="close-icon">✕</i>
              </button>
            </div>
            
            <div className="sale-details-info">
              <p><strong>Client:</strong> {selectedSale.clientName}</p>
              <p><strong>Contact:</strong> {selectedSale.clientContact || '-'}</p>
              <p><strong>Date:</strong> {selectedSale.saleDate.toLocaleDateString()}</p>
              <p><strong>Facture:</strong> {selectedSale.invoiceNumber}</p>
              {selectedSale.notes && <p><strong>Notes:</strong> {selectedSale.notes}</p>}
              <p><strong>Total:</strong> {selectedSale.total?.toFixed(2) || '0.00'} €</p>
            </div>
            
            <h5>Produits Vendus:</h5>
            <div className="table-container">
              <table className="sold-products-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Quantité Initiale</th>
                    <th>Quantité Vendue</th>
                    <th>Quantité Restante</th>
                    <th>Unité</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.products.map((product, idx) => (
                    <tr key={idx}>
                      <td>{product.name}</td>
                      <td>{product.originalQuantity}</td>
                      <td className="quantity-sold">-{product.soldQuantity}</td>
                      <td>{product.newQuantity}</td>
                      <td>{product.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )}
  </div>
</div>
)}
</div>
);
};
export default SellProduct;