import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './CreateRcp.css';

const CreateRecipe = () => {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [recipeName, setRecipeName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [activeTab, setActiveTab] = useState('define'); // 'define', 'execute', or 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [executionIngredients, setExecutionIngredients] = useState([]);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedExecution, setSelectedExecution] = useState(null);

  // Fetch ingredients from Firebase
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const ingredientsRef = collection(db, 'Ingredients');
        const ingredientsQuery = query(ingredientsRef, where("category", "==", "Matière Première"));
        const ingredientsSnapshot = await getDocs(ingredientsQuery);
        
        const ingredientsList = ingredientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setIngredients(ingredientsList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching ingredients: ", err);
        setLoading(false);
      }
    };

    fetchIngredients();
  }, []);

  // Fetch recipes from Firebase
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const recipesRef = collection(db, 'recipes');
        const recipesSnapshot = await getDocs(recipesRef);
        
        const recipesList = recipesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRecipes(recipesList);
      } catch (err) {
        console.error("Error fetching recipes: ", err);
      }
    };

    fetchRecipes();
  }, [activeTab]);

  // Fetch execution history from Firebase
  useEffect(() => {
    const fetchExecutionHistory = async () => {
      if (activeTab !== 'history') return;
      
      try {
        const executionsRef = collection(db, 'recipeExecutions');
        const executionsSnapshot = await getDocs(executionsRef);
        
        const executionsList = executionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          executedAt: doc.data().executedAt?.toDate() || new Date()
        }));
        
        // Sort by most recent first
        executionsList.sort((a, b) => b.executedAt - a.executedAt);
        
        setExecutionHistory(executionsList);
      } catch (err) {
        console.error("Error fetching execution history: ", err);
      }
    };

    fetchExecutionHistory();
  }, [activeTab]);

  // Add ingredient to recipe
  const addIngredient = (ingredient) => {
    if (!selectedIngredients.some(item => item.id === ingredient.id)) {
      setSelectedIngredients([...selectedIngredients, { 
        ...ingredient, 
        requiredQuantity: 0 
      }]);
    }
  };

  // Remove ingredient from recipe
  const removeIngredient = (id) => {
    setSelectedIngredients(selectedIngredients.filter(item => item.id !== id));
  };

  // Update required quantity for ingredient
  const updateRequiredQuantity = (id, quantity) => {
    setSelectedIngredients(
      selectedIngredients.map(ingredient => 
        ingredient.id === id ? { ...ingredient, requiredQuantity: quantity } : ingredient
      )
    );
  };

  // Save recipe to Firebase
  const saveRecipe = async () => {
    if (!recipeName.trim()) {
      alert("Veuillez entrer un nom de recette");
      return;
    }

    if (selectedIngredients.length === 0) {
      alert("Veuillez sélectionner au moins un ingrédient");
      return;
    }

    try {
      // Format recipe data - only name and ingredients
      const recipeData = {
        name: recipeName,
        ingredients: selectedIngredients.map(({ id, name, requiredQuantity, unit }) => ({
          ingredientId: id,
          name,
          requiredQuantity,
          unit
        })),
        createdAt: new Date()
      };

      // Add to Firestore
      await addDoc(collection(db, 'recipes'), recipeData);
      
      alert(`Recette "${recipeName}" enregistrée avec succès!`);
      
      // Reset form
      setRecipeName('');
      setSelectedIngredients([]);
    } catch (err) {
      console.error("Error saving recipe: ", err);
      alert("Échec de l'enregistrement de la recette. Veuillez réessayer.");
    }
  };

  // Handle recipe selection for execution
  const handleRecipeSelection = (recipe) => {
    setSelectedRecipe(recipe);
    
    // Map recipe ingredients to execution ingredients with available quantities
    const executionIngs = recipe.ingredients.map(recipeIng => {
      const availableIng = ingredients.find(ing => ing.id === recipeIng.ingredientId) || {};
      return {
        ...recipeIng,
        availableQuantity: availableIng.quantity || 0,
        actualQuantity: recipeIng.requiredQuantity // Default to required quantity
      };
    });
    
    setExecutionIngredients(executionIngs);
  };

  // Update actual quantity for execution
  const updateActualQuantity = (ingredientId, quantity) => {
    setExecutionIngredients(
      executionIngredients.map(ingredient => 
        ingredient.ingredientId === ingredientId ? { ...ingredient, actualQuantity: quantity } : ingredient
      )
    );
  };

  // Execute recipe (subtract quantities from ingredients)
// Inside the executeRecipe function, ensure the ingredient updates are working correctly:

const executeRecipe = async () => {
  if (!selectedRecipe) {
    alert("Veuillez sélectionner une recette");
    return;
  }

  if (!orderNumber.trim()) {
    alert("Veuillez entrer un numéro de commande");
    return;
  }

  if (!lotNumber.trim()) {
    alert("Veuillez entrer un numéro de lot");
    return;
  }

  try {
    // Validate ingredient quantities before execution
    const insufficientIngredients = executionIngredients.filter(
      (ingredient) => ingredient.actualQuantity > ingredient.availableQuantity
    );

    if (insufficientIngredients.length > 0) {
      alert(
        `Les ingrédients suivants ne sont pas disponibles en quantité suffisante: ${insufficientIngredients
          .map((ing) => ing.name)
          .join(", ")}`
      );
      return;
    }

    // Fetch actual ingredient quantities from Firestore before updating
    const updatedIngredients = await Promise.all(
      executionIngredients.map(async (ingredient) => {
        if (ingredient.actualQuantity <= 0) return null; // Skip ingredients with no usage

        const ingredientRef = doc(db, "Ingredients", ingredient.ingredientId);
        const ingredientDoc = await getDoc(ingredientRef);

        if (ingredientDoc.exists()) {
          const currentQuantity = ingredientDoc.data().quantity || 0;

          if (currentQuantity < ingredient.actualQuantity) {
            throw new Error(
              `Quantité insuffisante pour ${ingredient.name}. Disponible: ${currentQuantity} ${ingredient.unit}`
            );
          }

          const newQuantity = Math.max(0, currentQuantity - ingredient.actualQuantity);

          return {
            ingredientId: ingredient.ingredientId,
            name: ingredient.name,
            originalQuantity: currentQuantity,
            newQuantity,
            usedQuantity: ingredient.actualQuantity,
            unit: ingredient.unit,
          };
        }

        return null;
      })
    );

    // Remove null values (if any ingredient doesn't exist)
    const validIngredients = updatedIngredients.filter((ingredient) => ingredient !== null);

    if (validIngredients.length === 0) {
      alert("Aucun ingrédient valide pour l'exécution");
      return;
    }

    // Prepare execution data
    const executionData = {
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      orderNumber,
      lotNumber,
      executedAt: new Date(),
      ingredients: validIngredients,
    };

    // Save execution history
    await addDoc(collection(db, "recipeExecutions"), executionData);

    // Update ingredient quantities in Firestore
    for (const ingredient of validIngredients) {
      const ingredientRef = doc(db, "Ingredients", ingredient.ingredientId);
      await updateDoc(ingredientRef, {
        quantity: ingredient.newQuantity,
      });
    }

    alert(`Recette "${selectedRecipe.name}" exécutée avec succès!`);

    // Reset form
    setSelectedRecipe(null);
    setExecutionIngredients([]);
    setOrderNumber("");
    setLotNumber("");
  } catch (err) {
    console.error("Error executing recipe: ", err);
    alert(`Erreur lors de l'exécution de la recette: ${err.message}`);
  }
};


  // Filter ingredients based on search term
  const filteredIngredients = ingredients.filter(ingredient => 
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Chargement des ingrédients...</div>;
  }

  return (
    <div className="recipe-management">
    <h1>Gestion des Recettes</h1>
  
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
        className={`tab ${activeTab === 'define' ? 'active' : ''}`}
        onClick={() => setActiveTab('define')}
      >
        Définir une Recette
      </div>
      <div 
        className={`tab ${activeTab === 'execute' ? 'active' : ''}`}
        onClick={() => setActiveTab('execute')}
      >
        Exécuter une Recette
      </div>
      <div 
        className={`tab ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => setActiveTab('history')}
      >
        Historique d'Exécution
      </div>
    </div>
  
    {activeTab === 'define' && (
      <div className="recipe-content">
        <div className="recipe-info-panel">
          <div className="panel">
            <h3>Informations de la Recette</h3>
  
            <div className="form-group">
              <label>Nom de la Recette</label>
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="Entrez le nom de la recette (ex: Kaki, Chips)"
              />
            </div>
          </div>
  
          <div className="panel">
            <h3>Ingrédients Sélectionnés</h3>
  
            {selectedIngredients.length === 0 ? (
              <p className="no-items">Aucun ingrédient sélectionné</p>
            ) : (

              <div class="table-container">
              <table className="selection-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Disponible</th>
                    <th>Requis</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedIngredients.map(ingredient => (
                    <tr key={ingredient.id}>
                      <td>{ingredient.name}</td>
                      <td>{ingredient.quantity} {ingredient.unit}</td>
                      <td>
                        <div className="quantity-input">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={ingredient.requiredQuantity}
                            onChange={(e) => updateRequiredQuantity(
                              ingredient.id, 
                              parseFloat(e.target.value) || 0
                            )}
                          />
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn-delete"
                          onClick={() => removeIngredient(ingredient.id)}
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
              <button className="btn-save" onClick={saveRecipe}>
                Enregistrer la Recette <i className="save-icon">📋</i>
              </button>
            </div>
          </div>
        </div>
  
        <div className="panel ingredients-panel">
          <h3>Ingrédients Disponibles</h3>
  
          <div className="search-container">
            <input
              type="text"
              placeholder="Rechercher un ingrédient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <i className="search-icon">🔍</i>
          </div>

          <div class="table-container">
          <table className="ingredients-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Quantité Disponible</th>
                <th>Lot</th>
                <th>Magasin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-items">Aucun ingrédient trouvé</td>
                </tr>
              ) : (
                filteredIngredients.map(ingredient => (
                  <tr key={ingredient.id}>
                    <td>{ingredient.name}</td>
                    <td>{ingredient.quantity} {ingredient.unit}</td>
                    <td>{ingredient.lot || '-'}</td>
                    <td>{ingredient.magasin || '-'}</td>
                    <td>
                      <button
                        className="btn-add"
                        onClick={() => addIngredient(ingredient)}
                        disabled={selectedIngredients.some(item => item.id === ingredient.id)}
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
  
    {activeTab === 'execute' && (
      <div className="recipe-content">
        <div className="recipe-info-panel">
          <div className="panel">
            <h3>Sélectionner une Recette</h3>
  
            <div className="search-container">
              <input
                type="text"
                placeholder="Rechercher une recette..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <i className="search-icon">🔍</i>
            </div>

            <div class="table-container">
            <table className="ingredients-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Nombre d'Ingrédients</th>
                  <th>Date de Création</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-items">Aucune recette trouvée</td>
                  </tr>
                ) : (
                  recipes
                    .filter(recipe => recipe.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(recipe => (
                      <tr key={recipe.id} className={selectedRecipe?.id === recipe.id ? 'selected-row' : ''}>
                        <td>{recipe.name}</td>
                        <td>{recipe.ingredients.length}</td>
                        <td>{recipe.createdAt?.toDate().toLocaleDateString() || '-'}</td>
                        <td>
                          <button
                            className={`btn-add ${selectedRecipe?.id === recipe.id ? 'active' : ''}`}
                            onClick={() => handleRecipeSelection(recipe)}
                          >
                            Sélectionner
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
  
        {selectedRecipe && (
          <>
            <div className="panel">
              <h3>Détails de l'Exécution</h3>
  
              <div className="form-group">
                <label>Nom de la Recette</label>
                <input
                  type="text"
                  value={selectedRecipe.name}
                  disabled
                />
              </div>
  
              <div className="form-group">
                <label>Numéro de Commande</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Numéro de commande de fabrication"
                />
              </div>
  
              <div className="form-group">
                <label>Numéro de Lot</label>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="Numéro de lot pour cette exécution"
                />
              </div>
            </div>
  
            <div className="panel">
              <h3>Ingrédients de la Recette</h3>
  
              <div class="table-container">
              <table className="selection-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Disponible</th>
                    <th>Requis par la Recette</th>
                    <th>Quantité à Utiliser</th>
                  </tr>
                </thead>
                <tbody>
                  {executionIngredients.map(ingredient => (
                    <tr key={ingredient.ingredientId}>
                      <td>{ingredient.name}</td>
                      <td>{ingredient.availableQuantity} {ingredient.unit}</td>
                      <td>{ingredient.requiredQuantity} {ingredient.unit}</td>
                      <td>
                        <div className="quantity-input">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={ingredient.actualQuantity}
                            onChange={(e) => updateActualQuantity(
                              ingredient.ingredientId, 
                              parseFloat(e.target.value) || 0
                            )}
                            className={ingredient.actualQuantity > ingredient.availableQuantity ? 'error' : ''}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
  
              <div className="action-button-container">
                <button 
                  className="btn-save" 
                  onClick={executeRecipe}
                >
                  Exécuter la Recette <i className="execute-icon">✓</i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )}
  
    {activeTab === 'history' && (
      <div className="recipe-content">
        <div className="panel history-panel">
          <h3>Historique des Exécutions de Recettes</h3>
  
          <div className="search-container">
            <input
              type="text"
              placeholder="Rechercher par nom de recette ou numéro de commande..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              className="search-input"
            />
            <i className="search-icon">🔍</i>
          </div>
  
          {executionHistory.length === 0 ? (
            <p className="no-items">Aucun historique d'exécution trouvé</p>
          ) : (
            <>
             <div class="table-container">
              <table className="ingredients-table">
                <thead>
                  <tr>
                    <th>Recette</th>
                    <th>Numéro de Commande</th>
                    <th>Numéro de Lot</th>
                    <th>Date d'Exécution</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {executionHistory
                    .filter(execution => 
                      execution.recipeName?.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                      execution.orderNumber?.toLowerCase().includes(historySearchTerm.toLowerCase())
                    )
                    .map(execution => (
                      <tr key={execution.id} className={selectedExecution?.id === execution.id ? 'selected-row' : ''}>
                        <td>{execution.recipeName}</td>
                        <td>{execution.orderNumber}</td>
                        <td>{execution.lotNumber}</td>
                        <td>{execution.executedAt.toLocaleDateString()} {execution.executedAt.toLocaleTimeString()}</td>
                        <td>
                          <button
                            className="btn-view"
                            onClick={() => setSelectedExecution(execution)}
                          >
                            Détails <i className="view-icon">👁️</i>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
  
              {selectedExecution && (
  <div className="execution-details panel">
    <div className="execution-details-header">
      <h4>Détails de l'Exécution: {selectedExecution.recipeName}</h4>
      <button
        className="btn-close"
        onClick={() => setSelectedExecution(null)}
      >
        <i className="close-icon">✕</i>
      </button>
    </div>

    <div className="execution-details-info">
      <p>
        <strong>Date:</strong> {selectedExecution.executedAt.toLocaleDateString()} {selectedExecution.executedAt.toLocaleTimeString()}
      </p>
      <p>
        <strong>Commande:</strong> {selectedExecution.orderNumber}
      </p>
      <p>
        <strong>Lot:</strong> {selectedExecution.lotNumber}
      </p>
    </div>

    <h5>Changements des Ingrédients:</h5>
    <div class="quantity-changes-table-container">
    <table className="quantity-changes-table">
      <thead>
        <tr>
          <th>Ingrédient</th>
          <th>Quantité Initiale</th>
          <th>Quantité Utilisée</th>
          <th>Quantité Finale</th>
          <th>Unité</th>
        </tr>
      </thead>
      <tbody>
  {selectedExecution.ingredients.map((ingredient, idx) => (
    <tr key={idx}>
      <td>{ingredient.name}</td>
      <td>{ingredient.originalQuantity}</td>
      <td className="quantity-used">-{ingredient.usedQuantity}</td> {/* Fix here */}
      <td>{ingredient.newQuantity}</td>
      <td>{ingredient.unit}</td>
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

export default CreateRecipe;