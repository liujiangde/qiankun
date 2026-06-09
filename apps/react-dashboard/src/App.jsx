const cards = [
  { label: 'Active users', value: '12,480', trend: '+8.2%' },
  { label: 'Orders', value: '1,926', trend: '+4.7%' },
  { label: 'Conversion', value: '7.8%', trend: '+1.1%' }
]

const rows = [
  ['North', '$86,240', 'Healthy'],
  ['South', '$72,910', 'Watch'],
  ['East', '$94,305', 'Healthy'],
  ['West', '$68,122', 'Improve']
]

export default function App({ hostProps }) {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Micro App</p>
          <h2>Revenue Dashboard</h2>
        </div>
        <span className="source">{hostProps?.from || 'standalone'}</span>
      </header>

      <section className="cards" aria-label="Performance metrics">
        {cards.map((card) => (
          <article className="card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <em>{card.trend}</em>
          </article>
        ))}
      </section>

      <section className="table-wrap" aria-label="Regional revenue">
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>Revenue</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([region, revenue, status]) => (
              <tr key={region}>
                <td>{region}</td>
                <td>{revenue}</td>
                <td>
                  <span className={`pill ${status.toLowerCase()}`}>{status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
