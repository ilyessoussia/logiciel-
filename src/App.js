import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import AddItem from './components/Ajout';
import ViewInventory from './components/ViewInventory';
import CreateRecipe from './components/CreateRecipe';
import SellProduct from './components/SellProduct';
import './App.css';

function App() {
  const [inventory, setInventory] = useState(() => {
    const savedInventory = localStorage.getItem('inventory');
    return savedInventory ? JSON.parse(savedInventory) : [];
  });
  
  const [recipes, setRecipes] = useState(() => {
    const savedRecipes = localStorage.getItem('recipes');
    return savedRecipes ? JSON.parse(savedRecipes) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory));
  }, [inventory]);
  
  useEffect(() => {
    localStorage.setItem('recipes', JSON.stringify(recipes));
  }, [recipes]);
  
  useEffect(() => {
    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
  }, [salesHistory]);

  const addItem = (item) => {
    setInventory([...inventory, { ...item, id: Date.now().toString() }]);
  };

  const updateItem = (updatedItem) => {
    setInventory(
      inventory.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    );
  };

  const deleteItem = (id) => {
    setInventory(inventory.filter((item) => item.id !== id));
  };

  const addRecipe = (recipe) => {
    setRecipes([...recipes, { ...recipe, id: Date.now().toString() }]);
  };

  const executeRecipe = (recipeId, quantityToMake) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return false;

    // Clone the inventory to work with
    let newInventory = [...inventory];
    
    // Check if we have enough ingredients
    for (const ingredient of recipe.ingredients) {
      const inventoryItem = newInventory.find(item => item.id === ingredient.id);
      
      if (!inventoryItem || inventoryItem.quantity < ingredient.requiredQuantity * quantityToMake) {
        return false; // Not enough ingredients
      }
    }
    
    // Deduct ingredients from inventory
    for (const ingredient of recipe.ingredients) {
      newInventory = newInventory.map(item => {
        if (item.id === ingredient.id) {
          return {
            ...item,
            quantity: item.quantity - (ingredient.requiredQuantity * quantityToMake)
          };
        }
        return item;
      });
    }
    
    // Add the produced item to inventory
    const newProduct = {
      id: Date.now().toString(),
      name: recipe.name,
      quantity: recipe.outputQuantity * quantityToMake,
      unit: recipe.outputUnit,
      category: 'Article',
      magasin: recipe.magasin || '',
      minimumThreshold: recipe.minimumThreshold || 0,
      lot: recipe.lot,
      date: new Date().toISOString().slice(0, 10),
      notes: `Produit à partir de la recette: ${recipe.name}`,
      dt: new Date().toISOString().slice(0, 10),
      dlc: recipe.dlc || ''
    };
    
    newInventory.push(newProduct);
    setInventory(newInventory);
    return true;
  };



  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/add-item" 
            element={<AddItem addItem={addItem} />} 
          />
          <Route 
            path="/view-inventory" 
            element={<ViewInventory inventory={inventory} updateItem={updateItem} deleteItem={deleteItem} />} 
          />
          <Route 
            path="/create-recipe" 
            element={<CreateRecipe inventory={inventory} recipes={recipes} addRecipe={addRecipe} executeRecipe={executeRecipe} />} 
          />
          <Route path="/sales" element={<SellProduct />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;