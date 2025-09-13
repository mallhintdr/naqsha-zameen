// src/UserDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Spinner,
  Alert,
  ListGroup
} from 'react-bootstrap';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const [user,    setUser]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/users/${userId}`, { withCredentials: true })
      .then(res => setUser(res.data))
      .catch(err => {
        console.error(err);
        setError('Failed to load user details.');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }
  if (error) {
    return (
      <Container fluid className="mt-3">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  const now         = Date.now();
  const startOfDay  = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const oneWeekAgo  = new Date(now - 7  * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const sessions = user.sessions || [];

  const filterBy = from => sessions.filter(s => new Date(s.start) >= from);
  const todaySessions = filterBy(startOfDay);
  const weekSessions  = filterBy(oneWeekAgo);
  const monthSessions = filterBy(oneMonthAgo);

  const sumDur = arr => arr.reduce((sum, s) => sum + (s.duration || 0), 0);
  const maxDur = arr => arr.length ? Math.max(...arr.map(s => s.duration || 0)) : 0;
  const avgDur = (total, count) => count ? Math.round(total / count) : 0;
  const metrics = arr => {
    const count   = arr.length;
    const total   = sumDur(arr);
    const max     = maxDur(arr);
    const avg     = avgDur(total, count);
    const ipCount = new Set(arr.map(s => s.ipAddress)).size;
    return { count, total, max, avg, ipCount };
  };

  const todayM = metrics(todaySessions);
  const weekM  = metrics(weekSessions);
  const monthM = metrics(monthSessions);

  const toHMS = secs => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };
  const fmtDT = dt => dt ? new Date(dt).toLocaleString() : '—';

  return (
    <Container fluid className="mt-3">
      <Button variant="secondary" onClick={() => navigate(-1)}>← Back</Button>
      <h3 className="mt-3">{user.userName} ({user.userId})</h3>

      {/* Basic info / Subscription */}
      <Row className="mb-4">
        <Col xs={12} md={6} className="mb-3">
          <Card>
            <Card.Header>Basic Info</Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item><strong>Mobile:</strong> {user.mobileNumber}</ListGroup.Item>
              <ListGroup.Item><strong>Tehsil:</strong> {user.tehsil}</ListGroup.Item>
              <ListGroup.Item><strong>Subscription:</strong> {user.subscriptionType}</ListGroup.Item>
              <ListGroup.Item><strong>Fee:</strong> {user.fee}</ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
        <Col xs={12} md={6} className="mb-3">
          <Card>
            <Card.Header>Expiry & Renewals</Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item>
                <strong>Period:</strong>{' '}
                {new Date(user.startDate).toLocaleDateString()} –{' '}
                {new Date(user.endDate).toLocaleDateString()}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Status:</strong> {user.status} ({user.daysRemaining}d left)
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Renewals:</strong> {user.renewalCount}
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
      </Row>

      {/* Renewal history / Session metrics */}
      <Row className="mb-4">
        <Col xs={12} md={6} className="mb-3">
          <Card>
            <Card.Header>Renewal History</Card.Header>
            <Card.Body className="p-0">
              {user.renewalHistory.length > 0 ? (
                <div className="table-responsive">
                  <Table size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.renewalHistory.map((r, i) => (
                        <tr key={i}>
                          <td>{fmtDT(r.date)}</td>
                          <td>{r.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="m-3">No renewals yet.</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} className="mb-3">
          <Card>
            <Card.Header>Session Metrics</Card.Header>
            <Card.Body>
              <Row>
                {[
                  ['Today', todayM],
                  ['Last 7 Days', weekM],
                  ['Last 30 Days', monthM]
                ].map(([label, m], idx) => (
                  <Col xs={12} md={4} key={idx} className="mb-3">
                    <h6>{label}</h6>
                    <p className="mb-1"><strong>Sessions:</strong> {m.count}</p>
                    <p className="mb-1"><strong>Time:</strong> {toHMS(m.total)}</p>
                    <p className="mb-1"><strong>Max:</strong> {toHMS(m.max)}</p>
                    <p className="mb-1"><strong>Avg:</strong> {toHMS(m.avg)}</p>
                    <p className="mb-0"><strong>Unique IPs:</strong> {m.ipCount}</p>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* All sessions (fixed‑height scroll area, no toggle) */}
      <Card className="mb-3">
        <Card.Header>All Sessions</Card.Header>
        <Card.Body
          className="p-0"
          style={{ maxHeight: '50vh', overflowY: 'auto' }}
        >
          {sessions.length > 0 ? (
            <div className="table-responsive">
              <Table size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => (
                    <tr key={i}>
                      <td>{fmtDT(s.start)}</td>
                      <td>{fmtDT(s.end)}</td>
                      <td>{s.duration ? toHMS(s.duration) : '—'}</td>
                      <td>{s.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <p className="m-3">No sessions recorded.</p>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UserDetail;
