import React, { useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt-br'; // Tradução para português
import './App.css';

const Resumo = () => {
  const location = useLocation();
  const [combinedData, setCombinedData] = useState(location.state?.combinedData || []);
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState(null);

  // Função para converter datas no formato dd/mm/yyyy para um objeto Date
  const parseDate = (dateString) => {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  // Filtrar dados com base no intervalo de datas
  const dadosFiltrados = useMemo(() => {
    if (!combinedData.length) return [];
    let filtrados = combinedData;
    if (filtroDataInicio && filtroDataFim) {
      const inicio = parseDate(filtroDataInicio);
      const fim = parseDate(filtroDataFim);
      filtrados = filtrados.filter((item) => {
        const dataPrevisao = parseDate(item['Data de Previsão de Entrega']);
        return dataPrevisao >= inicio && dataPrevisao <= fim;
      });
    }
    return filtrados;
  }, [combinedData, filtroDataInicio, filtroDataFim]);

  // Função para agrupar dados por data
  const eventosPorData = useMemo(() => {
    const eventos = {};
    dadosFiltrados.forEach((item) => {
      const dataPrevisao = item['Data de Previsão de Entrega'];
      if (!eventos[dataPrevisao]) {
        eventos[dataPrevisao] = [];
      }
      eventos[dataPrevisao].push({
        produto: item.Produto,
        quantidadePrevista: item['Quantidade Prevista'],
        quantidadeEntregue: item.QuantidadeEntregue,
      });
    });
    return eventos;
  }, [dadosFiltrados]);

  // Função para renderizar os eventos no calendário
  const eventosCalendario = useMemo(() => {
    return Object.keys(eventosPorData).map((data) => ({
      title: `${eventosPorData[data].length} produtos previstos`,
      date: parseDate(data),
      extendedProps: {
        detalhes: eventosPorData[data],
      },
    }));
  }, [eventosPorData]);

  // Função para lidar com o clique em um evento do calendário
  const handleDateClick = (arg) => {
    const dataSelecionada = arg.dateStr; // Data no formato yyyy-MM-dd
    const dataFormatada = `${dataSelecionada.slice(8, 10)}/${dataSelecionada.slice(5, 7)}/${dataSelecionada.slice(0, 4)}`; // Converte para dd/mm/yyyy
    const eventosDoDia = eventosPorData[dataFormatada];
    if (eventosDoDia) {
      setDataSelecionada({
        start: dataFormatada,
        data: eventosDoDia,
      });
    } else {
      setDataSelecionada(null);
    }
  };

  // Função para recarregar os dados sem remover os filtros
  const recarregarDados = () => {
    // Simule a busca de novos dados (substitua isso pela sua lógica real de busca)
    const novosDados = location.state?.combinedData || []; // Exemplo: dados originais
    setCombinedData(novosDados); // Atualiza os dados mantendo os filtros
  };

  return (
    <div className="container">
      {/* Botão para voltar à tela anterior */}
      <Link to="/">
        <button className="action-button">Voltar</button>
      </Link>
      <h1>Calendário Previsão de Entrega</h1>

      {/* Filtros */}
      <div className="filtros">
        <label>
          Data Início:
          <input
            type="date"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
          />
        </label>
        <label>
          Data Fim:
          <input
            type="date"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
          />
        </label>
        {/* Botão para recarregar dados */}
        <button className="action-button" onClick={recarregarDados}>
          Recarregar Dados
        </button>
      </div>

      {/* Calendário */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={ptLocale} // Tradução para português
        events={eventosCalendario}
        dateClick={handleDateClick}
        eventContent={(arg) => {
          const tooltipContent = arg.event.extendedProps.detalhes
            .map(
              (item) =>
                `<strong>${item.produto}</strong>: ${item.quantidadePrevista} previstas, ${item.quantidadeEntregue} entregues`
            )
            .join('<br>');
          return (
            <div
              className="calendar-event"
              onMouseEnter={(e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'calendar-tooltip';
                tooltip.innerHTML = tooltipContent;
                document.body.appendChild(tooltip);
                const rect = e.target.getBoundingClientRect();
                tooltip.style.top = `${rect.top + window.scrollY - 10}px`;
                tooltip.style.left = `${rect.left + window.scrollX + 20}px`;
              }}
              onMouseLeave={() => {
                const tooltips = document.querySelectorAll('.calendar-tooltip');
                tooltips.forEach((tooltip) => tooltip.remove());
              }}
            >
              <strong>{arg.event.title}</strong>
            </div>
          );
        }}
        height="auto"
      />

      {/* Detalhes da Data Selecionada */}
      {dataSelecionada && (
        <div className="detalhes-data">
          <h2>Detalhes para {dataSelecionada.start}</h2>
          <ul>
            {dataSelecionada.data.map((item, index) => (
              <li key={index}>
                Produto: {item.produto}, Previsto: {item.quantidadePrevista}, Entregue:{' '}
                {item.quantidadeEntregue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Resumo;