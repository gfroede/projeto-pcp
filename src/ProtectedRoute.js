import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserActivated } from './user-validate';

const ProtectedRoute = ({ children }) => {
  const user = getUserActivated();

  if (!user) {
    // Redireciona para a página de login se o usuário não estiver logado
    return <Navigate to="/" replace />;
  }

  // Renderiza a página protegida se o usuário estiver logado
  return children;
};

export default ProtectedRoute;