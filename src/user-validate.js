// user-validate.js

// Variável para armazenar o estado do usuário ativo
let userActivated = null;

/**
 * Define o usuário ativo no sistema.
 * @param {Object} userData - Dados do usuário logado (ex.: { Name, User, Password }).
 */
export const setUserActivated = (userData) => {
  userActivated = userData;
};

/**
 * Retorna os dados do usuário ativo.
 * @returns {Object|null} - Dados do usuário ativo ou null se nenhum usuário estiver logado.
 */
export const getUserActivated = () => {
  return userActivated;
};

/**
 * Limpa os dados do usuário ativo (usado ao fazer logout).
 */
export const clearUserActivated = () => {
  userActivated = null;
};

/**
 * Verifica se há um usuário ativo no sistema.
 * @returns {boolean} - Retorna true se um usuário estiver ativo, caso contrário, false.
 */
export const isUserActivated = () => {
  return !!userActivated;
};