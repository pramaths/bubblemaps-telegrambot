import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, ChartTypeRegistry } from 'chart.js';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const width = 600;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

export async function generatePieChart(tokens: any[]): Promise<string> {
  const labels = tokens.map((token: any) => `${token.symbol}`);
  const data = tokens.map((token: any) => Number(token.valueUsd));

  const backgroundColors = [
    '#A2C6FF', '#FFEB99', '#99E5E5', '#B3A6FF', '#FFBE8C', // Light blue, yellow, green, purple, orange
    '#D18C8C', '#A5D6A7', '#C8C8FF', '#C9A2C9', '#FFB37D', // Light red, green, blue, pink, peach
    '#A6D0A0', '#F1C27D', '#B0D8C4', '#9EEC99', '#CCE1E1', // Light olive, golden, teal, light green, light cyan
    '#FFE084', '#F06A7D', '#B1A2F1', '#C9D3FF' // Light yellow, coral, pastel purple, pale blue
];


// Function to get random colors from the list
function getRandomColors(num: number) {
    const colors = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < num; i++) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * backgroundColors.length);
        } while (usedIndices.has(randomIndex));

        usedIndices.add(randomIndex);
        colors.push(backgroundColors[randomIndex]);
    }

    return colors;
}

  const configuration: ChartConfiguration<'pie', number[], string> = {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: getRandomColors(tokens.length),
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: $${value.toFixed(2)}`;
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            font: {
              size: 12
            }
          }
        }
      }
    },
    plugins: [
        {
          id: 'custom-slice-labels',
          afterDatasetDraw: (chart) => {
            const { ctx, data } = chart;
            const dataset = chart.data.datasets[0];
            const meta = chart.getDatasetMeta(0);
            const total = dataset.data
              .filter((val): val is number => typeof val === 'number' && val !== null)
              .reduce((acc: number, val: number) => acc + val, 0);
      
            ctx.save();
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
      
            meta.data.forEach((element: any, i: number) => {
              const value = Number(dataset.data[i] ?? 0);
              const percentage = (value / total) * 100;
      
              if (percentage >= 10) {
                const label = data.labels?.[i] || '';
                const x = element.tooltipPosition().x;
                const y = element.tooltipPosition().y;
      
                const lines = [
                  `${label}: $${value.toFixed(2)}`, 
                  `(${percentage.toFixed(2)}%)`
                ];
      
                lines.forEach((line, index) => {
                  ctx.fillText(line, x, y + index * 14 - 14); // spacing lines vertically
                });
              }
            });
      
            ctx.restore();
          }
        }
      ]      
  };

  // ✅ Ensure temp directory exists
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  // ✅ Save the chart image
  const filePath = path.join(tempDir, `token-chart-${randomUUID()}.png`);
  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration as ChartConfiguration<keyof ChartTypeRegistry>);
  fs.writeFileSync(filePath, imageBuffer);
  return filePath;
}
