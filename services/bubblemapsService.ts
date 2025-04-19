import axios from 'axios';

export interface MapMetadata {
  decentralisation_score?: number;
  identified_supply?: {
    percent_in_cexs: number;
    percent_in_contracts: number;
  };
  dt_update?: string;
  ts_update?: number;
  status: string;
  message?: string;
}

export interface MapAvailability {
  status: string;
  availability?: boolean;
  message?: string;
}

export interface MapNode {
  address: string;
  amount: number;
  is_contract: boolean;
  name?: string;
  percentage: number;
  transaction_count: number;
  transfer_count: number;
}

export interface MapData {
  version: number;
  chain: string;
  token_address: string;
  dt_update: string;
  full_name: string;
  symbol: string;
  is_X721: boolean;
  metadata: {
    max_amount: number;
    min_amount: number;
  };
  nodes: MapNode[];
  status?: string;
  message?: string;
}

export const getMapMetadata = async (chain: string, token: string): Promise<MapMetadata> => {
  try {
    const response = await axios.get(`https://api-legacy.bubblemaps.io/map-metadata?chain=${chain}&token=${token}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching map metadata:', error);
    return { status: 'KO', message: 'Failed to fetch map metadata' };
  }
};

export const getMapAvailability = async (chain: string, token: string): Promise<MapAvailability> => {
  try {
    const response = await axios.get(`https://api-legacy.bubblemaps.io/map-availability?chain=${chain}&token=${token}`);
    return response.data;
  } catch (error) {
    console.error('Error checking map availability:', error);
    return { status: 'KO', message: 'Failed to check map availability' };
  }
};

export const getMapData = async (chain: string, token: string): Promise<MapData> => {
  try {
    const response = await axios.get(`https://api-legacy.bubblemaps.io/map-data?chain=${chain}&token=${token}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching map data:', error);
    return { 
      version: 0,
      chain: '',
      token_address: '',
      dt_update: '',
      full_name: '',
      symbol: '',
      is_X721: false,
      metadata: { max_amount: 0, min_amount: 0 },
      nodes: [],
      status: 'KO', 
      message: 'Failed to fetch map data' 
    };
  }
};

export const getMapIframeUrl = (chain: string, token: string): string => {
  return `https://app.bubblemaps.io/${chain}/token/${token}`;
}; 