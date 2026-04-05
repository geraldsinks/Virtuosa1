/**
 * Admin Cookie & Analytics Data Dashboard Script
 */

document.addEventListener('DOMContentLoaded', () => {
    let viewsChartInstance = null;
    let donutChartInstance = null;

    const token = localStorage.getItem('token');
    
    // UI Elements
    const elTotalEvents = document.getElementById('kpi-total-events');
    const elUniqueSessions = document.getElementById('kpi-unique-sessions');
    const elPageviews = document.getElementById('kpi-pageviews');
    const elMarketing = document.getElementById('kpi-marketing');
    
    const elTopPagesTable = document.getElementById('top-pages-table');
    const elTopProductsTable = document.getElementById('top-products-table');

    // Timeframe buttons
    const timeframeBtns = document.querySelectorAll('.timeframe-btn');
    timeframeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            timeframeBtns.forEach(b => {
                b.classList.remove('bg-[#0A1128]', 'text-white');
                b.classList.add('text-gray-600', 'hover:bg-gray-50');
            });
            e.target.classList.remove('text-gray-600', 'hover:bg-gray-50');
            e.target.classList.add('bg-[#0A1128]', 'text-white');
            
            fetchData(e.target.dataset.period);
        });
    });

    async function fetchData(timeframe = '24h') {
        try {
            const url = window.URLHelper ? window.URLHelper.getApiUrl(`/api/analytics/admin/cookie-data?timeframe=${timeframe}`) : `/api/analytics/admin/cookie-data?timeframe=${timeframe}`;
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Failed to fetch data');
            const json = await res.json();
            
            if (json.success) {
                renderDashboard(json.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            alert('Could not fetch analytics data. Make sure you are an Admin.');
        }
    }

    function renderDashboard(data) {
        const { overview, categoryStats, topPages, topProducts, viewsOverTime } = data;

        // KPI Updates
        elTotalEvents.textContent = overview.totalEvents.toLocaleString();
        elUniqueSessions.textContent = overview.uniqueSessions.toLocaleString();
        
        let pageviews = 0;
        let marketingEvents = 0;
        
        categoryStats.forEach(stat => {
            if (stat._id === 'analytics') pageviews = stat.count;
            if (stat._id === 'marketing') marketingEvents = stat.count;
        });

        elPageviews.textContent = pageviews.toLocaleString();
        elMarketing.textContent = marketingEvents.toLocaleString();

        // Render Tables
        renderTopPages(topPages);
        renderTopProducts(topProducts);

        // Render Charts
        renderViewsChart(viewsOverTime);
        renderDonutChart(categoryStats);
    }

    function renderTopPages(pages) {
        if (!pages || pages.length === 0) {
            elTopPagesTable.innerHTML = `<tr><td colspan="3" class="px-6 py-6 text-center text-gray-500">No pageview data in this timeframe</td></tr>`;
            return;
        }

        elTopPagesTable.innerHTML = pages.map(page => `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-3 text-[#0A1128] font-medium max-w-[200px] truncate" title="${page._id}">${page._id || '/'}</td>
                <td class="px-6 py-3 text-right text-gray-600">${page.views.toLocaleString()}</td>
                <td class="px-6 py-3 text-right text-gray-600">${page.uniqueVisitors.toLocaleString()}</td>
            </tr>
        `).join('');
    }

    function renderTopProducts(products) {
        if (!products || products.length === 0) {
            elTopProductsTable.innerHTML = `<tr><td colspan="3" class="px-6 py-6 text-center text-gray-500">No product click data in this timeframe</td></tr>`;
            return;
        }

        elTopProductsTable.innerHTML = products.map(item => {
            const product = item._id;
            if (!product) return '';
            
            const priceStr = product.price ? `K${product.price.toLocaleString()}` : '-';
            
            return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-3">
                    <div class="flex items-center gap-3">
                        ${product.mainImage 
                            ? `<img src="${product.mainImage}" alt="" class="w-8 h-8 rounded-md object-cover">` 
                            : `<div class="w-8 h-8 rounded-md bg-gray-200"></div>`
                        }
                        <span class="text-[#0A1128] font-medium truncate max-w-[180px]">${product.title || 'Unknown Product'}</span>
                    </div>
                </td>
                <td class="px-6 py-3 text-right text-gray-600">${priceStr}</td>
                <td class="px-6 py-3 text-right text-[#0A1128] font-bold">${item.clicks.toLocaleString()}</td>
            </tr>
            `;
        }).join('');
    }

    function renderViewsChart(viewsData) {
        const ctx = document.getElementById('viewsChart').getContext('2d');
        
        if (viewsChartInstance) {
            viewsChartInstance.destroy();
        }

        const labels = viewsData.map(d => {
            // Shorten date format for display
            const dt = new Date(d.date);
            return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        
        const dataPoints = viewsData.map(d => d.views);

        if (dataPoints.length === 0) {
            // Fallback for empty data
            labels.push('No Data');
            dataPoints.push(0);
        }

        viewsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pageviews',
                    data: dataPoints,
                    borderColor: '#0A1128',
                    backgroundColor: 'rgba(10, 17, 40, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#FFD700',
                    pointBorderColor: '#0A1128'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }

    function renderDonutChart(categoryStats) {
        const ctx = document.getElementById('donutChart').getContext('2d');

        if (donutChartInstance) {
            donutChartInstance.destroy();
        }

        const labels = categoryStats.map(s => s._id.charAt(0).toUpperCase() + s._id.slice(1));
        const dataPoints = categoryStats.map(s => s.count);

        if (dataPoints.length === 0) {
            labels.push('No Events Yet');
            dataPoints.push(1);
        }

        donutChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataPoints,
                    backgroundColor: ['#0A1128', '#C19A6B', '#10B981', '#3B82F6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true }
                    }
                }
            }
        });
    }

    // Init
    fetchData('24h');
});
