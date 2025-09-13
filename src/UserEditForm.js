import React, { useState, useEffect } from 'react';
import {
  Form, Button, Alert, Row, Col, Modal, InputGroup
} from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from './AuthContext';

import {
  subscriptionOptions,
  calculateEndDate,
  calculateStatus
} from './userUtils';

import './styles/global.css';
import './styles/form.css';
import './styles/modal.css';
import './styles/profile.css';

axios.defaults.withCredentials = true;

const fetchTehsils = async () => {
  try {
    const apiBaseUrl = process.env.REACT_APP_API_URL || '';
    const url = `${apiBaseUrl}/api/tehsil-list`;
    const { data } = await axios.get(url);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('fetch tehsils error:', err.message);
    return [];
  }
};

const fetchMauzas = async (tehsil) => {
  if (!tehsil?.trim()) return [];
  try {
    const apiBaseUrl = process.env.REACT_APP_API_URL || '';
    const url = `${apiBaseUrl}/api/mauza-list/${encodeURIComponent(tehsil)}`;
    const { data } = await axios.get(url);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('fetch mauzas error:', err.message);
    return [];
  }
};

const uniqSort = (arr) =>
  Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));

export default function UserEditForm({ userId, handleClose, refreshUsers }) {
  const { loading } = useAuth();

  const [form, setForm] = useState(null);
  const [tehsilOptions, setTehsilOptions] = useState([]);
  const [selectedTehsil, setSelectedTehsil] = useState('');
  const [tehsilFilter, setTehsilFilter] = useState('');
  const [mauzaOptions, setMauzaOptions] = useState([]);
  const [selectedMauzas, setSelectedMauzas] = useState([]);
  const [mauzaFilter, setMauzaFilter] = useState('');
  const [msg, setMsg] = useState(null);

  // Load tehsils on mount
  useEffect(() => {
    fetchTehsils().then(list => setTehsilOptions(uniqSort(list)));
  }, []);

  // Load user data on edit
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data: u } = await axios.get(
          `${process.env.REACT_APP_API_URL}/users/${userId}`
        );
        setSelectedTehsil(typeof u.tehsil === 'string' ? u.tehsil : '');
        setSelectedMauzas(Array.isArray(u.mauzaList) ? u.mauzaList : []);
        const sd = u.startDate ? new Date(u.startDate).toISOString().split('T')[0] : '';
        const ed = sd && u.subscriptionType ? calculateEndDate(sd, u.subscriptionType) : '';
        const st = ed ? calculateStatus(ed) : 'Unknown';
        setForm({
          userName: u.userName || '',
          userId: u.userId || '',
          email: u.email || '',        // <----- EMAIL
          password: '',
          mobile: u.mobileNumber || '',
          startDate: sd,
          subscriptionType: u.subscriptionType || '',
          endDate: ed,
          status: st,
          fee: u.fee ?? 1000
        });
      } catch (err) {
        setMsg({ type: 'danger', text: 'Failed to load user.' });
      }
    })();
  }, [userId]);

  // Fetch mauzas whenever selectedTehsil changes
  useEffect(() => {
    if (!selectedTehsil) {
      setMauzaOptions([]);
      setSelectedMauzas([]);
      return;
    }
    (async () => {
      const mauzas = await fetchMauzas(selectedTehsil);
      setMauzaOptions(uniqSort(mauzas));
      setSelectedMauzas(prev => prev.filter(m => mauzas.includes(m)));
    })();
  }, [selectedTehsil]);

  // Helpers
  const handleTehsilSelect = (tehsil) => setSelectedTehsil(tehsil);
  const handleMauzaToggle = (mauza) => {
    setSelectedMauzas(prev =>
      prev.includes(mauza) ? prev.filter(m => m !== mauza) : [...prev, mauza]
    );
  };
  const selectAllMauzas = () => setSelectedMauzas(mauzaOptions);
  const clearAllMauzas = () => setSelectedMauzas([]);
  const visTehsils = tehsilOptions.filter(t =>
    t.toLowerCase().includes(tehsilFilter.toLowerCase())
  );
  const visMauzas = mauzaOptions.filter(m =>
    m.toLowerCase().includes(mauzaFilter.toLowerCase())
  );

  // Save changes
  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!selectedTehsil) {
      setMsg({ type: 'danger', text: 'Select a Tehsil.' });
      return;
    }
    if (selectedMauzas.length === 0) {
      setMsg({ type: 'danger', text: 'Select at least one Mauza.' });
      return;
    }
    const payload = {
      ...form,
      tehsil: selectedTehsil,
      email: form.email,         // <----- EMAIL
      mobileNumber: form.mobile,
      mauzaList: selectedMauzas,
    };
    if (!payload.password.trim()) delete payload.password;
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/users/${userId}`,
        payload
      );
      refreshUsers();
      handleClose();
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.message || err.message });
    }
  };

  if (loading || !form) return <Alert variant="info">Loading…</Alert>;

  return (
    <Modal show onHide={handleClose} centered size="lg">
      <Modal.Header closeButton><Modal.Title>Edit User</Modal.Title></Modal.Header>
      <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {msg && <Alert variant={msg.type}>{msg.text}</Alert>}
        <Form onSubmit={save}>
          {/* ---------- basic info ---------- */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>User Name</Form.Label>
                <Form.Control
                  value={form.userName}
                  onChange={e => setForm(p => ({ ...p, userName: e.target.value }))}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>User ID</Form.Label>
                <Form.Control value={form.userId} disabled />
              </Form.Group>
            </Col>
          </Row>

          {/* ---------- EMAIL & AUTH ---------- */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="Enter email"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={form.password}
                  placeholder="Leave blank to keep current"
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* ---------- MOBILE ---------- */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Mobile Number</Form.Label>
                <Form.Control
                  value={form.mobile}
                  onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          {/* ---------- TEHSIL SINGLE-CHECKLIST ---------- */}
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Select Tehsil</Form.Label>
                <InputGroup className="mb-1">
                  <Form.Control
                    placeholder="Search tehsil…"
                    value={tehsilFilter}
                    onChange={e => setTehsilFilter(e.target.value)}
                  />
                </InputGroup>
                <div className="tehsil-list-container border rounded p-2" style={{ maxHeight: 120, overflowY: 'auto' }}>
                  {tehsilOptions.length === 0 ? (
                    <small className="text-muted">No tehsils available.</small>
                  ) : visTehsils.length === 0 ? (
                    <small className="text-muted">No matches.</small>
                  ) : visTehsils.map(tehsil => (
                    <Form.Check
                      key={tehsil}
                      type="checkbox"
                      label={tehsil}
                      checked={selectedTehsil === tehsil}
                      onChange={() => handleTehsilSelect(tehsil)}
                      className="mb-1"
                    />
                  ))}
                </div>
                <small className="text-muted">Selected: {selectedTehsil || 'None'}</small>
              </Form.Group>
            </Col>
          </Row>

          {/* ---------- MAUZA MULTI-CHECKLIST ---------- */}
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Select Mauzas</Form.Label>
                <InputGroup className="mb-1">
                  <Form.Control
                    placeholder="Search mauza…"
                    value={mauzaFilter}
                    onChange={e => setMauzaFilter(e.target.value)}
                  />
                  <Button size="sm" variant="outline-secondary" onClick={selectAllMauzas}>
                    All
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={clearAllMauzas}>
                    None
                  </Button>
                </InputGroup>
                <div className="mauza-list-container border rounded p-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {mauzaOptions.length === 0 ? (
                    <small className="text-muted">No mauzas for selected tehsil.</small>
                  ) : visMauzas.length === 0 ? (
                    <small className="text-muted">No matches.</small>
                  ) : visMauzas.map(mauza => (
                    <Form.Check
                      key={mauza}
                      type="checkbox"
                      label={mauza}
                      checked={selectedMauzas.includes(mauza)}
                      onChange={() => handleMauzaToggle(mauza)}
                      className="mb-1"
                    />
                  ))}
                </div>
                <small className="text-muted">Selected: {selectedMauzas.length}</small>
              </Form.Group>
            </Col>
          </Row>

          {/* ---------- subscription ---------- */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Subscription Type</Form.Label>
                <Form.Select
                  value={form.subscriptionType}
                  onChange={e => setForm(p => ({ ...p, subscriptionType: e.target.value }))}
                >
                  <option value="">Select Type</option>
                  {subscriptionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.value}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* ---------- status ---------- */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>End Date</Form.Label>
                <Form.Control value={form.endDate} disabled />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Control value={form.status} disabled />
              </Form.Group>
            </Col>
          </Row>

          {/* ---------- fee ---------- */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label>Fee</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={form.fee}
                  onChange={e => setForm(p => ({ ...p, fee: e.target.value }))}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          {/* ---------- footer ---------- */}
          <div className="d-flex justify-content-end">
            <Button type="submit" className="me-2">Save</Button>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
