import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PlanilhaViewer = () => {
  const [dados, setDados] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sheetId = '1dgVHy_i0djzz8ncd1L2zOkzI3qy7YSbT7CvV_BPgXm0';  // ID da sua planilha
        const apiKey = 'YOUR_API_KEY';  // Substitua pela sua chave de API
        const sheetName = 'Sheet1';  // Certifique-se de colocar o nome correto da aba

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`;

        const response = await axios.get(url);
        setDados(response.data.values);
      } catch (error) {
        console.error('Erro ao obter dados da planilha:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Dados da Planilha</h1>
      <table border="1">
        <thead>
          <tr>
            {dados.length > 0 && dados[0].map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.slice(1).map((linha, index) => (
            <tr key={index}>
              {linha.map((celula, celIndex) => (
                <td key={celIndex}>{celula}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlanilhaViewer;