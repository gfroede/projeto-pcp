import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import { setUserActivated } from './user-validate'; // Importa setUserActivated

const Login = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [credentials, setCredentials] = useState({ user: '', password: '' });
  const [validationError, setValidationError] = useState('');
  const navigate = useNavigate();

  // Função para buscar os dados da aba Users
  const fetchUserData = async () => {
    try {
      const response = await axios.get(
        'https://docs.google.com/spreadsheets/d/1dgVHy_i0djzz8ncd1L2zOkzI3qy7YSbT7CvV_BPgXm0/gviz/tq?tqx=out:csv&sheet=Users'
      );
      return new Promise((resolve, reject) => {
        Papa.parse(response.data, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            if (result.data && result.data.length > 0) {
              setUsers(result.data);
              resolve();
            } else {
              reject(new Error('Dados não encontrados na aba Users.'));
            }
          },
          error: (error) => {
            console.error('Erro ao processar CSV:', error);
            reject(error);
          },
        });
      });
    } catch (error) {
      setError('Erro ao carregar dados dos usuários.');
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar os dados ao montar o componente
  useEffect(() => {
    fetchUserData();
  }, []);

  // Função para lidar com o envio do formulário de login
  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    const { user, password } = credentials;

    if (!user || !password) {
      setValidationError('Por favor, preencha todos os campos.');
      return;
    }

    const foundUser = users.find(
      (u) => u.User === user && u.Password === password
    );

    if (foundUser) {
      // Define o usuário ativo usando setUserActivated
      setUserActivated(foundUser);

      // Redirecionar para /home em caso de sucesso
      navigate('/home');
    } else {
      // Mostrar mensagem de erro se as credenciais forem inválidas
      setValidationError('Usuário ou senha incorretos.');
    }
  };

  // Função para atualizar os campos do formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="user">Usuário:</label>
            <input
              type="text"
              id="user"
              name="user"
              value={credentials.user}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Senha:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>
          {validationError && <p className="error">{validationError}</p>}
          <button type="submit">Entrar</button>
        </form>
      )}
    </div>
  );
};

export default Login;