import html2canvas from 'html2canvas';

export interface ChartExportData {
  title: string;
  imageData: string;
  description?: string;
}

/**
 * Converts a chart element to a base64 image
 */
export const chartToImage = async (chartElement: HTMLElement): Promise<string> => {
  try {
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 1, // Reduced quality to avoid large payloads
      useCORS: true,
      allowTaint: true,
      logging: false
    });
    
    return canvas.toDataURL('image/png', 0.8); // Compress to 80% quality
  } catch (error) {
    console.error('Error converting chart to image:', error);
    throw new Error('Failed to convert chart to image');
  }
};

/**
 * Converts multiple chart elements to images
 */
export const chartsToImages = async (chartSelectors: string[]): Promise<ChartExportData[]> => {
  const chartData: ChartExportData[] = [];
  
  for (const selector of chartSelectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      try {
        const imageData = await chartToImage(element);
        const title = element.getAttribute('data-chart-title') || 'Chart';
        const description = element.getAttribute('data-chart-description') || '';
        
        chartData.push({
          title,
          imageData,
          description
        });
      } catch (error) {
        console.error(`Error converting chart ${selector}:`, error);
      }
    }
  }
  
  return chartData;
};

/**
 * Prepares chart data for export with metadata
 */
export const prepareChartExport = async (): Promise<{
  charts: ChartExportData[];
  timestamp: string;
  pageInfo: {
    title: string;
    url: string;
  };
}> => {
  const timestamp = new Date().toISOString();
  const pageInfo = {
    title: document.title || 'KMU Discipline Desk Report',
    url: window.location.href
  };

  // Get all chart elements on the page
  const chartElements = document.querySelectorAll('[data-chart-export="true"]');
  const chartSelectors = Array.from(chartElements).map(el => `#${el.id}`);
  
  const charts = await chartsToImages(chartSelectors);
  
  return {
    charts,
    timestamp,
    pageInfo
  };
}; 