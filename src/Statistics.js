// src/Statistics.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Modal,
  Button,
  Table,
  Form
} from 'react-bootstrap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const Statistics = () => {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState();
  const [totalUsers, setTotalUsers]     = useState(0);
  const [totalOnline, setTotalOnline]   = useState(0);
  const [data24h, setData24h]           = useState([]);
  const [data7d,  setData7d]            = useState([]);
  const [data30d, setData30d]           = useState([]);

  // Modal state
  const [showOnline, setShowOnline]         = useState(false);
  const [onlineUsers, setOnlineUsers]       = useState([]);
  const [loadingOnline, setLoadingOnline]   = useState(false);

  // Online users filter/sort state
  const [userFilters, setUserFilters]       = useState({});
  const [userSort, setUserSort]             = useState({});

  // ----------- Fetch main stats -----------
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          `${process.env.REACT_APP_API_URL}/stats`,
          { withCredentials: true }
        );
        setTotalUsers(data.totalUsers);
        setTotalOnline(data.totalOnline);

        // Build concurrency curves
        const sessions = data.sessions.map(s => ({
          start: new Date(s.start),
          end  : s.end ? new Date(s.end) : null
        }));
        const now = new Date();
        const countBetween = (from, to) =>
          sessions.filter(s => s.start < to && (!s.end || s.end >= from)).length;

        const buildSeries = (days) => {
          const buckets = [];
          for (let i = days - 1; i >= 0; i--) {
            const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const to   = new Date(from); to.setDate(to.getDate() + 1);
            buckets.push({
              label: from.toLocaleDateString(),
              count: countBetween(from, to)
            });
          }
          return buckets;
        };

        // 24h – hourly
        const hours = [];
        for (let i = 23; i >= 0; i--) {
          const from = new Date(now.getTime() - i * 3600e3);
          const to   = new Date(from.getTime() + 3600e3);
          hours.push({ label: `${from.getHours()}:00`, count: countBetween(from, to) });
        }
        setData24h(hours);
        setData7d (buildSeries(7));
        setData30d(buildSeries(30));

      } catch (err) {
        console.error('Statistics load error:', err);
        setError('Could not load statistics.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ----------- Fetch online users -----------
  const fetchOnlineUsers = async () => {
    setLoadingOnline(true);
    try {
      const { data } = await axios.get(
        `${process.env.REACT_APP_API_URL}/online-users`,
        { withCredentials: true }
      );
      setOnlineUsers(data);
    } catch (err) {
      console.error('Online‑users load error:', err);
      setOnlineUsers([]);
    } finally {
      setLoadingOnline(false);
    }
  };

  // --- Sort/Filter handlers for online users modal ---
  const handleOnlineUserFilter = (e, key) => {
    setUserFilters(prev => ({ ...prev, [key]: e.target.value }));
  };
  const handleOnlineUserSort = (key) => {
    setUserSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // --- Calculate unique online user count ---
  const uniqueUserIds = new Set(onlineUsers.map(u => u.userId));
  const uniqueUserCount = uniqueUserIds.size;

  // --- Filter and sort logic for table ---
  let filteredOnlineUsers = [...onlineUsers];
  Object.entries(userFilters).forEach(([key, val]) => {
    if (val) {
      filteredOnlineUsers = filteredOnlineUsers.filter(u => {
        const field = String(u[key] ?? '');
        return field.toLowerCase().includes(val.toLowerCase());
      });
    }
  });
  if (userSort.key) {
    filteredOnlineUsers.sort((a, b) => {
      const aField = String(a[userSort.key] ?? '');
      const bField = String(b[userSort.key] ?? '');
      return userSort.direction === 'asc'
        ? aField.localeCompare(bField)
        : bField.localeCompare(aField);
    });
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <Spinner animation="border" />
      </div>
    );
  }
  if (error) return <Alert variant="danger" className="m-3">{error}</Alert>;

  const charts = [
    { title: 'Users Online (Last 24 Hours)', data: data24h },
    { title: 'Users Online (Last 7 Days)',    data: data7d },
    { title: 'Users Online (Last 30 Days)',   data: data30d }
  ];

  return (
    <Container fluid className="mt-3">
      <h2 className="mb-4">Statistics</h2>

      {/* ---------- summary cards ---------- */}
      <Row className="mb-4">
        <Col xs={12} md={6} className="mb-3">
          <Card>
            <Card.Body>
              <p className="mb-0"><strong>Total registered users:</strong></p>
              <h3>{totalUsers}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6} className="mb-3">
          <Card>
            <Card.Body className="d-flex align-items-center">
              <div>
                <p className="mb-0"><strong>Users online now:</strong></p>
                <h3 className="mb-0">{totalOnline}</h3>
              </div>
              <Button
                variant="outline-primary"
                size="sm"
                className="ms-auto"
                onClick={() => { setShowOnline(true); fetchOnlineUsers(); }}
              >
                View Online Users
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ---------- charts ---------- */}
      <Row>
        {charts.map((c, idx) => (
          <Col xs={12} key={idx} className="mb-4">
            <Card className="h-100">
              <Card.Header>{c.title}</Card.Header>
              <Card.Body style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={c.data} margin={{ right: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ---------- online‑users modal ---------- */}
      <Modal
        show={showOnline}
        onHide={() => setShowOnline(false)}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Users Currently Online
            <span className="ms-3 text-secondary" style={{ fontSize: '1rem' }}>
              Unique Users: <strong>{uniqueUserCount}</strong>
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loadingOnline ? (
            <div className="d-flex justify-content-center p-3">
              <Spinner animation="border" />
            </div>
          ) : filteredOnlineUsers.length ? (
            <div className="table-responsive">
              <Table size="sm" striped bordered>
                <thead>
                  <tr>
                    {[
                      { key: 'userName', label: 'Name' },
                      { key: 'userId', label: 'User ID' },
                      { key: 'tehsil', label: 'Tehsil' },
                      { key: 'ipAddress', label: 'IP Address' },
                      { key: 'start', label: 'Session Start' },
                      { key: 'subscriptionType', label: 'Subscription' }
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        style={{ cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap' }}
                        onClick={() => handleOnlineUserSort(key)}
                      >
                        {label}
                        {userSort.key === key && (
                          <span style={{ marginLeft: 4, fontSize: '0.8rem' }}>
                            {userSort.direction === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {['userName', 'userId', 'tehsil', 'ipAddress', 'start', 'subscriptionType'].map(key => (
                      <th key={`f-${key}`} style={{ padding: 5 }}>
                        <Form.Control
                          size="sm"
                          placeholder="Search"
                          value={userFilters[key] || ''}
                          onChange={e => handleOnlineUserFilter(e, key)}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOnlineUsers.map((u, i) => (
                    <tr key={i}>
                      <td>{u.userName}</td>
                      <td>{u.userId}</td>
                      <td>{u.tehsil}</td>
                      <td>{u.ipAddress}</td>
                      <td>{new Date(u.start).toLocaleString()}</td>
                      <td>{u.subscriptionType}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="info">No users are online right now.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOnline(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Statistics;
