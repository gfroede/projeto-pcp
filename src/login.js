import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import { setUserActivated } from './user-validate';

// Componentes do Material UI
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';

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

  // Carrega os dados ao montar o componente
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
      // Define o usuário ativo
      setUserActivated(foundUser);
      // Redireciona para /home em caso de sucesso
      navigate('/home');
    } else {
      setValidationError('Usuário ou senha incorretos.');
    }
  };

  // Atualiza os campos do formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Login
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
            <TextField
              label="Usuário"
              name="user"
              value={credentials.user}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Senha"
              name="password"
              type="password"
              value={credentials.password}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            {validationError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {validationError}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
            >
              Entrar
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Login;
