import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import './App.css';

const Resumo = () => {
  const location = useLocation();
  const combinedData = location.state?.combinedData || [];

  // Função para calcular o resumo por produto
  const resumoPorProduto = useMemo(() => {
    const resumo = {};

    combinedData.forEach((item) => {
      const { Produto, QuantidadePrevista, QuantidadeEntregue } = item;

      if (!resumo[Produto]) {
        resumo[Produto] = {
          totalPrevisto: 0,
          totalEntregue: 0,
          totalAtrasado: 0,
        };
      }

      // Soma os valores previstos e entregues
      resumo[Produto].totalPrevisto += QuantidadePrevista || 0;
      resumo[Produto].totalEntregue += QuantidadeEntregue || 0;

      // Calcula o atrasado apenas se houver diferença positiva
      const atrasado = Math.max(
        (QuantidadePrevista || 0) - (QuantidadeEntregue || 0),
        0
      );
      resumo[Produto].totalAtrasado += atrasado;
    });

    return Object.keys(resumo).map((produto) => ({
      produto,
      ...resumo[produto],
    }));
  }, [combinedData]);

  return (
    <div className="container">
      <h1>Resumo por Produto</h1>
      <Link to="/">
        <button className="voltar-button">Voltar para Home</button>
      </Link>
      <table className="data-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Total Previsto</th>
            <th>Total Entregue</th>
            <th>Total Atrasado</th>
          </tr>
        </thead>
        <tbody>
          {resumoPorProduto.map((item, index) => (
            <tr key={index}>
              <td>{item.produto}</td>
              <td>{item.totalPrevisto}</td>
              <td>{item.totalEntregue}</td>
              <td className={item.totalAtrasado > 0 ? 'faltante-red' : 'faltante-green'}>
                {item.totalAtrasado}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Resumo;