import axios from 'axios';

// Função para obter os dados da Google Sheets
export const getSheetData = async () => {
  try {
    const response = await axios.get('<sua-url-do-google-sheets-aqui>');
    return response.data;
  } catch (error) {
    console.error('Erro ao obter os dados:', error);
    return [];
  }
};
