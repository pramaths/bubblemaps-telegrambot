import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import fs from 'fs';
import path from 'path';

// Helper function to generate pie chart
export async function generatePieChart(tokens: any[]) {
    const width = 800;
    const height = 600;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
        width,
        height,
        chartCallback: (ChartJS) => {
            ChartJS.register(ChartDataLabels); // 👈 Important for showing labels
        }
    });

    const labels = tokens.map(token => token.symbol);
    const data = tokens.map(token => Number(token.valueUsd));

    const total = data.reduce((sum, value) => sum + value, 0); // Total value for percentage calculation

    const backgroundColors = [
        '#4e79a7', '#f28e2c', '#e15759', '#76b7b2',
        '#59a14f', '#edc949', '#af7aa1', '#ff9da7',
        '#9c755f', '#bab0ab'
    ];

    const configuration: ChartConfiguration<'pie', number[], unknown> = {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: backgroundColors,
                borderWidth: 1,
                borderColor: '#ffffff',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Token Balance Distribution',
                    font: {
                        size: 24,
                    }
                },
                datalabels: {
                    color: '#000000', // black for better visibility
                    align: 'center',  // center the label inside the pie slice
                    anchor: 'center', // anchor the label in the center of the slice
                    formatter: (value: number, context: any) => {
                        const label = context.chart.data.labels?.[context.dataIndex] || '';
                        const percentage = (value / total) * 100;

                        // Show label only if percentage is >= 10%
                        if (percentage >= 10) {
                            return `${label}: $${value.toFixed(2)}\n(${percentage.toFixed(2)}%)`;
                        }
                        return ''; // Hide label for smaller segments
                    },
                    font: {
                        weight: 'bold',
                        size: 12,
                    },
                    clamp: true,
                    textAlign:'center'
                },
            },
            layout: {
                padding: 20,
            }
        }
    };

    const image = await chartJSNodeCanvas.renderToBuffer(configuration);

    const filePath = path.join(__dirname, `token_balance_chart_${Date.now()}.png`);
    fs.writeFileSync(filePath, image);
    return filePath;
}
