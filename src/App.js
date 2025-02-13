import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './login';
import Home from './home';
import Resumo from './Resumo';
import ProtectedRoute from './ProtectedRoute'; // Importa o ProtectedRoute

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Rota pública para o login */}
        <Route path="/" element={<Login />} />

        {/* Rotas protegidas */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resumo"
          element={
            <ProtectedRoute>
              <Resumo />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;