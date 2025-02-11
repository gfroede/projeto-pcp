import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './home'; // Certifique-se de que o nome do arquivo seja consistente
import Resumo from './Resumo';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/resumo" element={<Resumo />} />
      </Routes>
    </Router>
  );
};

export default App;