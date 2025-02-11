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
  Tooltip,
  Legend,
} from 'chart.js';
import ReactPaginate from 'react-paginate';
import * as XLSX from 'xlsx';
import { format } from 'date-fns'; // Importa a função format do date-fns
import './App.css';

// Registra os componentes necessários do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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
  const [dataEntregaRealFiltro, setDataEntregaRealFiltro] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // Paginação
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // Ordenação
  const navigate = useNavigate();

  // Função para converter datas no formato dd/mm/aaaa para um objeto Date
  const parseDate = (dateString) => {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('/').map(Number); // Converte os valores para números
    return new Date(year, month - 1, day); // Cria a data no fuso horário local
  };

  // Função genérica para buscar dados de uma planilha
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

  // Combinar os dados das abas Previsão e Entrega
  const combinedData = useMemo(() => {
    if (!previsaoData.length || !entregaData.length) return [];
    return previsaoData.map((previsaoItem) => {
      const entregas = entregaData.filter(
        (item) =>
          item.Codigo === previsaoItem.Codigo &&
          item['Data Referente (Planejada)'] === previsaoItem['Data de Previsão de Entrega']
      );
      const quantidadeEntregue = entregas.reduce(
        (acc, curr) => acc + (curr['Quantidade Entregue'] || 0),
        0
      );
      const diferenca = (quantidadeEntregue || 0) - (previsaoItem['Quantidade Prevista'] || 0);
      const percentualEntrega =
        ((quantidadeEntregue || 0) / (previsaoItem['Quantidade Prevista'] || 1)) * 100;

      // Obter a data de entrega real (se disponível)
      const dataEntregaReal = entregas.length > 0 ? entregas[0]['Data de Entrega Real'] : null;

      return {
        ...previsaoItem,
        QuantidadeEntregue: quantidadeEntregue,
        Diferenca: diferenca, // Armazena a diferença (positiva ou negativa)
        PercentualEntrega: percentualEntrega.toFixed(2), // Percentual de entrega com duas casas decimais
        DataEntregaReal: dataEntregaReal, // Adiciona a data de entrega real
      };
    });
  }, [previsaoData, entregaData]);

  // Lista de produtos únicos para o filtro
  const produtosUnicos = useMemo(() => {
    const produtos = combinedData.map((item) => item.Produto);
    return [...new Set(produtos)];
  }, [combinedData]);

  // Função para aplicar os filtros
  const dadosFiltrados = useMemo(() => {
    if (!combinedData.length) return [];
    let filtrados = combinedData;

    // Filtro por período
    const hoje = new Date();
    switch (periodoFiltro) {
      case '30_dias':
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(hoje.getDate() - 30);
        filtrados = filtrados.filter((item) => {
          const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
          return dataPrevisao >= trintaDiasAtras && dataPrevisao <= hoje;
        });
        break;
      case 'proximos_30_dias':
        const proximosTrintaDias = new Date();
        proximosTrintaDias.setDate(hoje.getDate() + 30);
        filtrados = filtrados.filter((item) => {
          const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
          return dataPrevisao >= hoje && dataPrevisao <= proximosTrintaDias;
        });
        break;
      case 'mes_passado':
        const primeiroDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const ultimoDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        filtrados = filtrados.filter((item) => {
          const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
          return dataPrevisao >= primeiroDiaMesPassado && dataPrevisao <= ultimoDiaMesPassado;
        });
        break;
      case 'mes_atual':
        const primeiroDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        filtrados = filtrados.filter((item) => {
          const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
          return dataPrevisao >= primeiroDiaMesAtual && dataPrevisao <= ultimoDiaMesAtual;
        });
        break;
      case 'customizado':
        if (dataInicio && dataFim) {
          const inicio = parseDate(dataInicio);
          const fim = parseDate(dataFim);
          filtrados = filtrados.filter((item) => {
            const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
            return dataPrevisao >= inicio && dataPrevisao <= fim;
          });
        }
        break;
      default:
        break;
    }

    // Filtro por nome do produto
    if (produtoFiltro) {
      filtrados = filtrados.filter((item) => item.Produto === produtoFiltro);
    }

    // Filtro por situação (falta, excedente, igual)
    if (situacaoFiltro === 'falta') {
      filtrados = filtrados.filter((item) => item.Diferenca < 0);
    } else if (situacaoFiltro === 'excedente') {
      filtrados = filtrados.filter((item) => item.Diferenca > 0);
    } else if (situacaoFiltro === 'igual') {
      filtrados = filtrados.filter((item) => item.Diferenca === 0);
    }

    // Filtro por data de entrega real
    if (dataEntregaRealFiltro) {
      const dataEntregaReal = parseDate(dataEntregaRealFiltro);
      filtrados = filtrados.filter((item) => {
        const dataEntregaRealItem = parseDate(item.DataEntregaReal);
        return dataEntregaRealItem && dataEntregaRealItem.getTime() === dataEntregaReal.getTime();
      });
    }

    // Ordenação
    if (sortConfig.key) {
      filtrados.sort((a, b) => {
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
  }, [combinedData, periodoFiltro, dataInicio, dataFim, produtoFiltro, situacaoFiltro, dataEntregaRealFiltro, sortConfig]);

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

  // Carregar dados ao montar o componente
  useEffect(() => {
    reloadData();
  }, []);

  // Navegação para a página de resumo
  const handleNavigateToResumo = () => {
    navigate('/resumo', { state: { combinedData } });
  };

  // Função para estilizar a célula de percentual de entrega
  const getPercentualStyle = (percentual) => {
    if (percentual < 40) return 'percentual-red'; // Vermelho se abaixo de 40%
    if (percentual >= 40 && percentual <= 90) return 'percentual-orange'; // Laranja entre 41% e 90%
    return 'percentual-green'; // Verde acima de 91%
  };

  // Função para alternar o modo escuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode', !darkMode);
  };

  // Função para exportar dados para Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(dadosFiltrados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Filtrados');
    XLSX.writeFile(workbook, 'dados_filtrados.xlsx');
  };

  // Função para lidar com a ordenação
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Configuração da paginação
  const itemsPerPage = 10; // Número de itens por página
  const pageCount = Math.ceil(dadosFiltrados.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return dadosFiltrados.slice(start, end);
  }, [dadosFiltrados, currentPage]);

  // Função para mudar de página
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
        {/* Título */}
        <h1 className="title">Dados Compilados</h1>
  
        {/* Painel de Resumo */}
        <div className="summary-panel">
          <div className="summary-item">
            <strong>Total Previsto:</strong> {totalPrevisto}
          </div>
          <div className="summary-item">
            <strong>Total Entregue:</strong> {totalEntregue}
          </div>
          <div className="summary-item">
            <strong>Falta:</strong> {totalFalta}
          </div>
          <div className="summary-item">
            <strong>Excedente:</strong> {totalExcedente}
          </div>
        </div>
  
        {/* Botões de Ação */}
        <div className="actions">
          <button className="action-button" onClick={toggleDarkMode}>
            {darkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          <button className="action-button" onClick={exportToExcel}>
            Exportar para Excel
          </button>
        </div>
  
        {/* Filtros */}
        <div className="filters">
          <label className="filter-label">
            Período:
            <select
              className="filter-select"
              value={periodoFiltro}
              onChange={(e) => setPeriodoFiltro(e.target.value)}
            >
              <option value="30_dias">Últimos 30 dias</option>
              <option value="proximos_30_dias">Próximos 30 dias</option>
              <option value="mes_passado">Mês Passado</option>
              <option value="mes_atual">Mês Atual</option>
              <option value="customizado">Intervalo Customizado</option>
            </select>
          </label>
          {periodoFiltro === 'customizado' && (
            <div className="date-range">
              <label className="filter-label">
                Data Início:
                <input
                  type="date"
                  className="filter-input"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </label>
              <label className="filter-label">
                Data Fim:
                <input
                  type="date"
                  className="filter-input"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </label>
            </div>
          )}
          <label className="filter-label">
            Produto:
            <select
              className="filter-select"
              value={produtoFiltro}
              onChange={(e) => setProdutoFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              {produtosUnicos.map((produto) => (
                <option key={produto} value={produto}>
                  {produto}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-label">
            Situação:
            <select
              className="filter-select"
              value={situacaoFiltro}
              onChange={(e) => setSituacaoFiltro(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="falta">Falta</option>
              <option value="excedente">Excedente</option>
              <option value="igual">Igual</option>
            </select>
          </label>
          <label className="filter-label">
            Data de Entrega Real:
            <input
              type="date"
              className="filter-input"
              value={dataEntregaRealFiltro}
              onChange={(e) => setDataEntregaRealFiltro(e.target.value)}
            />
          </label>
          <label className="filter-label">
            Ordenar Por:
            <select
              className="filter-select"
              value={sortConfig.key}
              onChange={(e) => handleSort(e.target.value)}
            >
              <option value="">Selecione</option>
              <option value="PercentualEntrega">Percentual de Entrega</option>
              <option value="QuantidadeEntregue">Mais Excedentes</option>
              <option value="Data de Previsão de Entrega">Data de Previsão</option>
              <option value="DataEntregaReal">Data de Entrega Real</option>
            </select>
          </label>
          <button className="reload-button" onClick={reloadData} disabled={loading}>
            Recarregar Dados
          </button>
          <Link to="/resumo" state={{ combinedData }}>
            <button className="summary-button">Ver Resumo</button>
          </Link>
        </div>
  
        {/* Loading e Erro */}
        {loading && (
          <div className="loading">
            Carregando... <progress />
          </div>
        )}
        {error && <div className="error">{error}</div>}
        {!loading && !error && (
          <>
            {/* Tabela de Dados */}
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
                    <th
                      key={header}
                      className="table-header"
                      onClick={() => handleSort(header.toLowerCase().replace(/ /g, '_'))}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, index) => {
                  const dataPrevisao = parseDate(row['Data de Previsão de Entrega']);
                  const dataEntregaReal = parseDate(row.DataEntregaReal);
                  const diferenca = row.Diferenca; // Diferença entre entregue e previsto
  
                  // Ícone informativo com base na diferença
                  const statusIcon = () => {
                    if (diferenca === 0) {
                      return '✅'; // Entrega completa
                    } else if (diferenca > 0) {
                      return '✅'; // Excedente
                    } else {
                      return '❌'; // Falta
                    }
                  };
  
                  return (
                    <React.Fragment key={`${row.Codigo}-${row['Data de Previsão de Entrega']}-${index}`}>
                      <tr className={getPercentualStyle(row.PercentualEntrega)}>
                        <td>{row.Codigo}</td>
                        <td>{row.Produto}</td>
                        <td>{row['Quantidade Prevista']}</td>
                        <td>{dataPrevisao ? format(dataPrevisao, 'dd/MM/yyyy') : 'N/A'}</td>
                        <td className={dataEntregaReal && dataEntregaReal > dataPrevisao ? 'atrasado' : ''}>
                          {dataEntregaReal ? format(dataEntregaReal, 'dd/MM/yyyy') : 'N/A'}
                        </td>
                        <td>{row.QuantidadeEntregue}</td>
                        <td className={getPercentualStyle(row.PercentualEntrega)}>
                          {row.PercentualEntrega}% {/* Exibe o percentual de entrega */}
                        </td>
                      </tr>
                      {/* Gráfico abaixo da linha */}
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
                                    backgroundColor: ['#f0ad4e', '#5cb85c'], // Amarelo para previsto, verde para entregue
                                    borderColor: ['#f0ad4e', '#5cb85c'],
                                    borderWidth: 1,
                                  },
                                ],
                              }}
                              options={{
                                indexAxis: 'y', // Define o gráfico como horizontal
                                responsive: true,
                                maintainAspectRatio: false, // Permite ajustar o tamanho manualmente
                                plugins: {
                                  legend: {
                                    display: false, // Oculta a legenda
                                  },
                                  tooltip: {
                                    enabled: true,
                                  },
                                },
                                scales: {
                                  x: {
                                    beginAtZero: true,
                                    max: Math.max(
                                      row['Quantidade Prevista'],
                                      row.QuantidadeEntregue
                                    ), // Valor máximo dinâmico
                                  },
                                  y: {
                                    barPercentage: 0.8, // Ajusta a largura das barras
                                    categoryPercentage: 0.8, // Ajusta o espaçamento entre as categorias
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