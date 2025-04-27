import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';

const width = 800;
const height = 400;

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

export async function generateLineChart(
    labels: string[],
    priceData: number[],
    volumeData: number[],
    title: string
): Promise<Buffer> {
    // Helper to calculate min/max with padding
    function getAxisLimits(data: number[]): { min: number, max: number } {
        const filtered = data.filter((v) => !isNaN(v));
        if (filtered.length === 0) return { min: 0, max: 1 };
        const min = Math.min(...filtered);
        const max = Math.max(...filtered);
        if (min === max) {
            // Flat line: add small padding
            const pad = min === 0 ? 1 : Math.abs(min) * 0.05;
            return { min: min - pad, max: max + pad };
        }
        const range = max - min;
        return { min: min - range * 0.1, max: max + range * 0.1 };
    }
    const priceLimits = getAxisLimits(priceData);
    const volumeLimits = getAxisLimits(volumeData);
    const configuration: ChartConfiguration = {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Price',
                    data: priceData,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.0001,
                    yAxisID: 'y',
                },
                {
                    label: 'Volume',
                    data: volumeData,
                    borderColor: 'rgb(153, 102, 255)',
                    tension: 0.0001,
                    yAxisID: 'y1',
                },
            ],
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                },
                legend: {
                    display: true,
                },
                tooltip: {
                    callbacks: {
                        label: function(context: any) {
                            // Show up to 8 decimals for small values
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(8)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Price',
                    },
                    min: priceLimits.min,
                    max: priceLimits.max,
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Volume',
                    },
                    min: volumeLimits.min,
                    max: volumeLimits.max,
                    grid: {
                        drawOnChartArea: false,
                    },
                },
            },
        },
    };

    // If all values are zero or nearly constant, optionally overlay a message
    const allZeroOrFlat = (arr: number[]) => arr.every((v) => Math.abs(v - arr[0]) < 1e-12);
    if (allZeroOrFlat(priceData) && allZeroOrFlat(volumeData)) {
        // Overlay text if the chart would be blank
        const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        // Optionally: add text overlay here if needed (requires more canvas manipulation)
        return buffer;
    }
    return await chartJSNodeCanvas.renderToBuffer(configuration);
}
