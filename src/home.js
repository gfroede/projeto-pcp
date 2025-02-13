import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import Papa from 'papaparse';
import { useNavigate, Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import ReactPaginate from 'react-paginate';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import './App.css';
import { getUserActivated } from './user-validate';

// Componentes do Material UI
import {
  AppBar,
  Toolbar,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button as MUIButton,
  CircularProgress,
  Tooltip,
} from '@mui/material';

// Registra os componentes necessários do ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const Home = () => {
  const [previsaoData, setPrevisaoData] = useState([]);
  const [entregaData, setEntregaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodoFiltro, setPeriodoFiltro] = useState('30_dias');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [produtoFiltro, setProdutoFiltro] = useState('');
  const [situacaoFiltro, setSituacaoFiltro] = useState('');
  // Removido o filtro de "Data de Entrega Real"
  const [darkMode, setDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  // sortConfig armazena a chave de ordenação, o valor exibido e a direção
  const [sortConfig, setSortConfig] = useState({ key: '', display: '', direction: 'asc' });
  const navigate = useNavigate();

  // Mapeamento de exibição (header) para a chave real dos dados
  const sortKeyMapping = {
    'Código': 'Codigo',
    'Produto': 'Produto',
    'Quantidade Prevista': 'Quantidade Prevista',
    'Data de Previsão': 'Data de Previsão de Entrega',
    'Data de Entrega Real': 'DataEntregaReal',
    'Entregue': 'QuantidadeEntregue',
    'Percentual': 'PercentualEntrega',
  };

  // Função para converter datas do formato dd/mm/aaaa para objeto Date
  const parseDate = (dateString) => {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  // Função para buscar dados de uma planilha via CSV
  const fetchSheetData = async (url, setData) => {
    try {
      const response = await axios.get(url);
      return new Promise((resolve, reject) => {
        Papa.parse(response.data, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (result) => {
            if (result.data && result.data.length > 0) {
              setData(result.data);
              resolve();
            } else {
              reject(new Error('Dados não encontrados na planilha.'));
            }
          },
          error: (error) => {
            console.error('Erro ao processar CSV:', error);
            reject(error);
          },
        });
      });
    } catch (error) {
      if (!axios.isCancel(error)) {
        throw error;
      }
    }
  };

  // Combina os dados das abas Previsão e Entrega
  const combinedData = useMemo(() => {
    if (!previsaoData.length && !entregaData.length) return [];

    // Cria um mapa com chave: Código + Data de Previsão
    const previsaoMap = new Map();
    previsaoData.forEach((item) => {
      const key = `${item.Codigo}-${item['Data de Previsão de Entrega']}`;
      previsaoMap.set(key, item);
    });

    let combined = [];

    // Adiciona itens da aba Previsão e calcula entregas correspondentes
    previsaoData.forEach((previsaoItem) => {
      const key = `${previsaoItem.Codigo}-${previsaoItem['Data de Previsão de Entrega']}`;
      const entregas = entregaData.filter(
        (item) =>
          item.Codigo === previsaoItem.Codigo &&
          item['Data Referente (Planejada)'] === previsaoItem['Data de Previsão de Entrega']
      );
      const quantidadeEntregue = entregas.reduce(
        (acc, curr) => acc + (curr['Quantidade Entregue'] || 0),
        0
      );
      const diferenca = quantidadeEntregue - (previsaoItem['Quantidade Prevista'] || 0);
      const percentualEntrega = ((quantidadeEntregue / (previsaoItem['Quantidade Prevista'] || 1)) * 100).toFixed(2);
      const dataEntregaReal = entregas.length > 0 ? entregas[0]['Data de Entrega Real'] : null;

      combined.push({
        ...previsaoItem,
        QuantidadeEntregue: quantidadeEntregue,
        Diferenca: diferenca,
        PercentualEntrega: percentualEntrega,
        DataEntregaReal: dataEntregaReal,
      });
    });

    // Adiciona itens que estão apenas na aba Entrega (sem previsão)
    entregaData.forEach((entregaItem) => {
      const possivelChave = `${entregaItem.Codigo}-${entregaItem['Data Referente (Planejada)']}`;
      if (!previsaoMap.has(possivelChave)) {
        combined.push({
          Codigo: entregaItem.Codigo,
          Produto: entregaItem.Produto,
          'Quantidade Prevista': 0,
          'Data de Previsão de Entrega': null,
          QuantidadeEntregue: entregaItem['Quantidade Entregue'] || 0,
          Diferenca: entregaItem['Quantidade Entregue'] || 0,
          PercentualEntrega: '100.00',
          DataEntregaReal: entregaItem['Data de Entrega Real'] || null,
        });
      }
    });

    return combined;
  }, [previsaoData, entregaData]);

  // Lista de produtos únicos ordenados alfabeticamente
  const produtosUnicos = useMemo(() => {
    const produtos = [...new Set(combinedData.map((item) => item.Produto))];
    return produtos.sort((a, b) => a.localeCompare(b));
  }, [combinedData]);

  // Aplica os filtros selecionados (removemos o filtro de Data de Entrega Real)
  const dadosFiltrados = useMemo(() => {
    if (!combinedData.length) return [];
    let filtrados = combinedData;

    // Filtro por período
    const hoje = new Date();
    switch (periodoFiltro) {
      case '30_dias': {
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(hoje.getDate() - 30);
        filtrados = filtrados.filter((item) => {
          const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
          return dataPrevisao >= trintaDiasAtras && dataPrevisao <= hoje;
        });
        break;
      }
      case 'proximos_30_dias': {
        const proximosTrintaDias = new Date();
        proximosTrintaDias.setDate(hoje.getDate() + 30);
        filtrados = filtrados.filter((item) => {
          const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
          return dataPrevisao >= hoje && dataPrevisao <= proximosTrintaDias;
        });
        break;
      }
      case 'mes_passado': {
        const primeiroDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const ultimoDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        filtrados = filtrados.filter((item) => {
          const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
          return dataPrevisao >= primeiroDiaMesPassado && dataPrevisao <= ultimoDiaMesPassado;
        });
        break;
      }
      case 'mes_atual': {
        const primeiroDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        filtrados = filtrados.filter((item) => {
          const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
          return dataPrevisao >= primeiroDiaMesAtual && dataPrevisao <= ultimoDiaMesAtual;
        });
        break;
      }
      case 'customizado': {
        if (dataInicio && dataFim) {
          const inicio = parseDate(dataInicio);
          const fim = parseDate(dataFim);
          filtrados = filtrados.filter((item) => {
            const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
            return dataPrevisao >= inicio && dataPrevisao <= fim;
          });
        }
        break;
      }
      default:
        break;
    }

    // Filtro por produto
    if (produtoFiltro) {
      filtrados = filtrados.filter((item) => item.Produto === produtoFiltro);
    }

    // Filtro por situação
    if (situacaoFiltro === 'falta') {
      filtrados = filtrados.filter((item) => item.Diferenca < 0);
    } else if (situacaoFiltro === 'excedente') {
      filtrados = filtrados.filter((item) => item.Diferenca > 0);
    } else if (situacaoFiltro === 'igual') {
      filtrados = filtrados.filter((item) => item.Diferenca === 0);
    }

    // Ordenação: cria uma cópia para ordenar e não mutar o array original
    if (sortConfig.key) {
      filtrados = [...filtrados].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Tratamento especial para campos numéricos ou datas
        if (sortConfig.key === 'PercentualEntrega') {
          aValue = parseFloat(a.PercentualEntrega);
          bValue = parseFloat(b.PercentualEntrega);
        } else if (sortConfig.key === 'Data de Previsão de Entrega') {
          aValue = parseDate(a['Data de Previsão de Entrega']);
          bValue = parseDate(b['Data de Previsão de Entrega']);
        } else if (sortConfig.key === 'DataEntregaReal') {
          aValue = parseDate(a.DataEntregaReal);
          bValue = parseDate(b.DataEntregaReal);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtrados;
  }, [combinedData, periodoFiltro, dataInicio, dataFim, produtoFiltro, situacaoFiltro, sortConfig]);

  // Função para recarregar os dados
  const reloadData = async () => {
    try {
      setError(null);
      setLoading(true);
      await Promise.all([
        fetchSheetData(
          'https://docs.google.com/spreadsheets/d/1dgVHy_i0djzz8ncd1L2zOkzI3qy7YSbT7CvV_BPgXm0/gviz/tq?tqx=out:csv&sheet=Previsao',
          setPrevisaoData
        ),
        fetchSheetData(
          'https://docs.google.com/spreadsheets/d/1dgVHy_i0djzz8ncd1L2zOkzI3qy7YSbT7CvV_BPgXm0/gviz/tq?tqx=out:csv&sheet=Entrega',
          setEntregaData
        ),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados. Verifique os links ou tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Carrega os dados ao montar o componente
  useEffect(() => {
    reloadData();
  }, []);

  // Navega para a página de resumo
  const handleNavigateToResumo = () => {
    navigate('/resumo', { state: { combinedData } });
  };

  // Alterna o modo escuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode', !darkMode);
  };

  // Exporta os dados para Excel
  const exportToExcel = () => {
    const formattedData = dadosFiltrados.map((row) => ({
      Código: row.Codigo,
      Produto: row.Produto,
      'Quantidade Prevista': row['Quantidade Prevista'],
      'Data de Previsão': row['Data de Previsão de Entrega'],
      'Data de Entrega Real': row.DataEntregaReal,
      Entregue: row.QuantidadeEntregue,
      Percentual: row.PercentualEntrega,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Filtrados');
    XLSX.writeFile(workbook, 'dados_filtrados.xlsx');
  };

  // Função para tratar a ordenação (recebe o data key e o valor de exibição)
  const handleSort = (dataKey, displayName) => {
    let direction = 'asc';
    if (sortConfig.key === dataKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: dataKey, display: displayName, direction });
  };

  // Configuração da paginação
  const itemsPerPage = 10;
  const pageCount = Math.ceil(dadosFiltrados.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return dadosFiltrados.slice(start, end);
  }, [dadosFiltrados, currentPage]);

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  // Cálculo do painel de resumo
  const totalPrevisto = dadosFiltrados.reduce((acc, curr) => acc + (curr['Quantidade Prevista'] || 0), 0);
  const totalEntregue = dadosFiltrados.reduce((acc, curr) => acc + (curr.QuantidadeEntregue || 0), 0);
  const totalFalta = dadosFiltrados.reduce((acc, curr) => acc + Math.max(0, (curr['Quantidade Prevista'] || 0) - (curr.QuantidadeEntregue || 0)), 0);
  const totalExcedente = dadosFiltrados.reduce((acc, curr) => acc + Math.max(0, (curr.QuantidadeEntregue || 0) - (curr['Quantidade Prevista'] || 0)), 0);

  return (
    <div className={`container ${darkMode ? 'dark-mode' : ''}`}>
      {/* Cabeçalho com AppBar */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Controle - PCP
          </Typography>
          <MUIButton color="inherit" onClick={toggleDarkMode}>
            {darkMode ? 'Modo Claro' : 'Modo Escuro'}
          </MUIButton>
        </Toolbar>
      </AppBar>

      {/* Painel de Resumo */}
      <Card sx={{ marginTop: 3, marginBottom: 3 }}>
        <CardContent>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" align="center">Total Previsto</Typography>
              <Typography variant="subtitle1" align="center">{totalPrevisto}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" align="center">Total Entregue</Typography>
              <Typography variant="subtitle1" align="center">{totalEntregue}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" align="center">Falta</Typography>
              <Typography variant="subtitle1" align="center">{totalFalta}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" align="center">Excedente</Typography>
              <Typography variant="subtitle1" align="center">{totalExcedente}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <Grid container spacing={2} justifyContent="center" sx={{ marginBottom: 3 }}>
        <Grid item>
        <MUIButton
  variant="contained"
  onClick={reloadData}
  disabled={loading}
  sx={{
    backgroundColor: '#28AA04', // cor personalizada somente para este botão
    '&:hover': {
      backgroundColor: '##3AEE08'
    }
  }}
>
  Exportar para Excel
</MUIButton>
        </Grid>
        <Grid item>
          <Link to="/resumo" state={{ combinedData }} style={{ textDecoration: 'none' }}>
            <MUIButton variant="contained">
              CALENDÁRIO
            </MUIButton>
          </Link>
        </Grid>
        <Grid item>
        <MUIButton
  variant="contained"
  onClick={reloadData}
  disabled={loading}
  sx={{
    backgroundColor: '#FF5722', // cor personalizada somente para este botão
    '&:hover': {
      backgroundColor: '#E64A19'
    }
  }}
>
  Recarregar Dados
</MUIButton>
        </Grid>
      </Grid>

      {/* Filtros em Card */}
      <Card sx={{ marginBottom: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  label="Período"
                  value={periodoFiltro}
                  onChange={(e) => setPeriodoFiltro(e.target.value)}
                >
                  <MenuItem value="30_dias">Últimos 30 dias</MenuItem>
                  <MenuItem value="proximos_30_dias">Próximos 30 dias</MenuItem>
                  <MenuItem value="mes_passado">Mês Passado</MenuItem>
                  <MenuItem value="mes_atual">Mês Atual</MenuItem>
                  <MenuItem value="customizado">Intervalo Customizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {periodoFiltro === 'customizado' && (
              <>
                <Grid item xs={12} sm={4} md={3}>
                  <TextField
                    label="Data Início"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                  <TextField
                    label="Data Fim"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth>
                <InputLabel>Produto</InputLabel>
                <Select
                  label="Produto"
                  value={produtoFiltro}
                  onChange={(e) => setProdutoFiltro(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {produtosUnicos.map((produto) => (
                    <MenuItem key={produto} value={produto}>
                      {produto}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth>
                <InputLabel>Situação</InputLabel>
                <Select
                  label="Situação"
                  value={situacaoFiltro}
                  onChange={(e) => setSituacaoFiltro(e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="falta">Falta</MenuItem>
                  <MenuItem value="excedente">Excedente</MenuItem>
                  <MenuItem value="igual">Igual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth>
                <InputLabel>Ordenar Por</InputLabel>
                {/* As opções são exatamente iguais aos cabeçalhos */}
                <Select
                  label="Ordenar Por"
                  value={sortConfig.display}
                  onChange={(e) =>
                    handleSort(sortKeyMapping[e.target.value], e.target.value)
                  }
                >
                  <MenuItem value="">Selecione</MenuItem>
                  <MenuItem value="Código">Código</MenuItem>
                  <MenuItem value="Produto">Produto</MenuItem>
                  <MenuItem value="Quantidade Prevista">Quantidade Prevista</MenuItem>
                  <MenuItem value="Data de Previsão">Data de Previsão</MenuItem>
                  <MenuItem value="Data de Entrega Real">Data de Entrega Real</MenuItem>
                  <MenuItem value="Entregue">Entregue</MenuItem>
                  <MenuItem value="Percentual">Percentual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loading e Erro */}
      {loading && (
        <Grid container justifyContent="center" sx={{ marginY: 3 }}>
          <CircularProgress />
        </Grid>
      )}
      {error && (
        <Typography align="center" color="error" sx={{ marginY: 3 }}>
          {error}
        </Typography>
      )}

      {/* Tabela de Dados */}
      {!loading && !error && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                {[
                  'Código',
                  'Produto',
                  'Quantidade Prevista',
                  'Data de Previsão',
                  'Data de Entrega Real',
                  'Entregue',
                  'Percentual',
                ].map((header) => (
                  <Tooltip key={header} title="Clique para ordenar" arrow>
                    <th
                      className="table-header"
                      onClick={() => handleSort(sortKeyMapping[header], header)}
                    >
                      {header}
                    </th>
                  </Tooltip>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => {
                const dataPrevisao = parseDate(row['Data de Previsão de Entrega']);
                const dataEntregaReal = parseDate(row.DataEntregaReal);
                return (
                  <React.Fragment key={`${row.Codigo}-${row['Data de Previsão de Entrega']}-${index}`}>
                    <tr className={row.PercentualEntrega < 40 ? 'percentual-red' : row.PercentualEntrega >= 40 && row.PercentualEntrega <= 90 ? 'percentual-orange' : 'percentual-green'}>
                      <td>{row.Codigo}</td>
                      <td>{row.Produto}</td>
                      <td>{row['Quantidade Prevista']}</td>
                      <td>{dataPrevisao ? format(dataPrevisao, 'dd/MM/yyyy') : 'N/A'}</td>
                      <td className={dataEntregaReal && dataPrevisao && dataEntregaReal > dataPrevisao ? 'atrasado' : ''}>
                        {dataEntregaReal ? format(dataEntregaReal, 'dd/MM/yyyy') : 'N/A'}
                      </td>
                      <td>{row.QuantidadeEntregue}</td>
                      <td>{row.PercentualEntrega}%</td>
                    </tr>
                    <tr>
                      <td colSpan="7" style={{ padding: '10px 0' }}>
                        <div style={{ width: '100%', height: '150px' }}>
                          <Bar
                            data={{
                              labels: ['Previsto', 'Entregue'],
                              datasets: [
                                {
                                  label: 'Valores',
                                  data: [row['Quantidade Prevista'], row.QuantidadeEntregue],
                                  backgroundColor: ['#f0ad4e', '#5cb85c'],
                                  borderColor: ['#f0ad4e', '#5cb85c'],
                                  borderWidth: 1,
                                },
                              ],
                            }}
                            options={{
                              indexAxis: 'y',
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                tooltip: { enabled: true },
                              },
                              scales: {
                                x: {
                                  beginAtZero: true,
                                  max: Math.max(
                                    row['Quantidade Prevista'],
                                    row.QuantidadeEntregue
                                  ),
                                },
                                y: {
                                  barPercentage: 0.8,
                                  categoryPercentage: 0.8,
                                },
                              },
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Paginação */}
          <ReactPaginate
            previousLabel={'Anterior'}
            nextLabel={'Próximo'}
            breakLabel={'...'}
            pageCount={pageCount}
            marginPagesDisplayed={2}
            pageRangeDisplayed={5}
            onPageChange={handlePageClick}
            containerClassName={'pagination'}
            activeClassName={'active'}
          />
        </>
      )}
    </div>
  );
};

export default Home;
