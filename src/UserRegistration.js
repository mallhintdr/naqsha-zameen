import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card, Container, Row, Col, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getCurrentDate, subscriptionOptions } from './userUtils';
import './styles/global.css';
import './styles/form.css';

// Fetch tehsil list
const fetchTehsils = async () => {
  try {
    const apiBaseUrl = process.env.REACT_APP_API_URL || '';
    const url = `${apiBaseUrl}/api/tehsil-list`;
    const { data } = await axios.get(url);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to fetch tehsils:', err.message);
    return [];
  }
};

// Fetch mauzas for a tehsil
const fetchMauzasByTehsil = async (tehsil) => {
  if (!tehsil) return [];
  try {
    const apiBaseUrl = process.env.REACT_APP_API_URL || '';
    const { data } = await axios.get(`${apiBaseUrl}/api/mauza-list/${encodeURIComponent(tehsil)}`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to fetch mauzas:', err.message);
    return [];
  }
};

const uniqSort = (arr) =>
  Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));

const UserRegistration = () => {
  const [formData, setFormData] = useState({
    userName: '',
    userId: '',
    password: '',
    email: '',
    tehsil: '',
    mobileNumber: '',
    startDate: getCurrentDate(),
    subscriptionType: 'Trial',
    userType: 'user',
    fee: 1000,
  });
  const [tehsilOptions, setTehsilOptions] = useState([]);
  const [selectedTehsil, setSelectedTehsil] = useState('');
  const [tehsilFilter, setTehsilFilter] = useState('');
  const [mauzaOptions, setMauzaOptions] = useState([]);
  const [selectedMauzas, setSelectedMauzas] = useState([]);
  const [mauzaFilter, setMauzaFilter] = useState('');
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTehsils().then(list => setTehsilOptions(uniqSort(list)));
  }, []);

  useEffect(() => {
    setFormData(prev => ({ ...prev, tehsil: selectedTehsil }));
    if (!selectedTehsil) {
      setMauzaOptions([]);
      setSelectedMauzas([]);
      return;
    }
    fetchMauzasByTehsil(selectedTehsil).then(list => {
      setMauzaOptions(uniqSort(list));
      setSelectedMauzas([]);
    });
  }, [selectedTehsil]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'fee' ? Number(value) : value
    }));
  };

  const handleMauzaToggle = (mauza) => {
    setSelectedMauzas((prev) =>
      prev.includes(mauza) ? prev.filter(m => m !== mauza) : [...prev, mauza]
    );
  };
  const selectAll = () => setSelectedMauzas(mauzaOptions);
  const clearAll  = () => setSelectedMauzas([]);

  const visTehsils = tehsilOptions.filter(t =>
    t.toLowerCase().includes(tehsilFilter.toLowerCase())
  );
  const visMauzas = mauzaOptions.filter(m =>
    m.toLowerCase().includes(mauzaFilter.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTehsil) {
      setMessage({
        type: 'danger',
        text: 'Please select a Tehsil.'
      });
      return;
    }
    if (selectedMauzas.length === 0) {
      setMessage({
        type: 'danger',
        text: 'Please select at least one Mauza.'
      });
      return;
    }
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/register`,
        {
          ...formData,
          tehsil: selectedTehsil,
          mauzaList: selectedMauzas
        }
      );
      setMessage({
        type: 'success',
        text: `User "${formData.userName}" registered successfully!`
      });
      setFormData({
        userName: '',
        userId: '',
        password: '',
        email: '',
        tehsil: '',
        mobileNumber: '',
        startDate: getCurrentDate(),
        subscriptionType: 'Trial',
        userType: 'user',
        fee: 1000
      });
      setSelectedTehsil('');
      setMauzaOptions([]);
      setSelectedMauzas([]);
      setTehsilFilter('');
      setMauzaFilter('');
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Registration failed'
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      userName: '',
      userId: '',
      password: '',
      email: '',
      tehsil: '',
      mobileNumber: '',
      startDate: getCurrentDate(),
      subscriptionType: 'Trial',
      userType: 'user',
      fee: 1000
    });
    setSelectedTehsil('');
    setMauzaOptions([]);
    setSelectedMauzas([]);
    setTehsilFilter('');
    setMauzaFilter('');
    setMessage(null);
  };

  return (
    <Container className="registration-container">
      <Row className="justify-content-center align-items-center">
        <Col md={8} lg={6}>
          <Card className="p-4 shadow">
            <h4 className="text-center mb-1">User Registration</h4>
            {message && <Alert variant={message.type}>{message.text}</Alert>}
            <div className="scrollable-form-container">
              <Form onSubmit={handleSubmit}>
                {/* Row 1: Name & ID */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>User Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="userName"
                        value={formData.userName}
                        onChange={handleChange}
                        placeholder="Enter user name"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>User ID</Form.Label>
                      <Form.Control
                        type="text"
                        name="userId"
                        value={formData.userId}
                        onChange={handleChange}
                        placeholder="Enter user ID"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Row 2: Email & Password */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter email"
                        autoComplete="off"
                        // Not required; set required if you want to enforce
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter password"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Row 3: Tehsil select */}
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
                      <div className="tehsil-list-container border rounded p-2" style={{ maxHeight: 120, overflowY: 'auto', background: '#fff' }}>
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
                            onChange={() => setSelectedTehsil(tehsil)}
                            className="mb-1"
                          />
                        ))}
                      </div>
                      <small className="text-muted">Selected: {selectedTehsil || 'None'}</small>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Row 4: Mobile & Mauza */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mobile Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        placeholder="Enter mobile number"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Select Mauzas</Form.Label>
                      <InputGroup className="mb-1">
                        <Form.Control
                          placeholder="Search mauza…"
                          value={mauzaFilter}
                          onChange={e => setMauzaFilter(e.target.value)}
                          className="mb-1"
                        />
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          className="me-1"
                          onClick={selectAll}
                          disabled={mauzaOptions.length === 0}
                        >
                          All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={clearAll}
                          disabled={mauzaOptions.length === 0}
                        >
                          None
                        </Button>
                      </InputGroup>
                      <div className="mauza-list-container border rounded p-2" style={{ maxHeight: 170, overflowY: 'auto', background: '#fff' }}>
                        {mauzaOptions.length === 0 ? (
                          <small className="text-muted">No mauzas for this tehsil.</small>
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

                {/* Row 5: Subscription & Start Date */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Subscription Type</Form.Label>
                      <Form.Select
                        name="subscriptionType"
                        value={formData.subscriptionType}
                        onChange={handleChange}
                      >
                        {subscriptionOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.value}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Row 6: User Type & Fee */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>User Type</Form.Label>
                      <Form.Select
                        name="userType"
                        value={formData.userType}
                        onChange={handleChange}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Fee</Form.Label>
                      <Form.Control
                        type="number"
                        name="fee"
                        value={formData.fee}
                        onChange={handleChange}
                        min={0}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Buttons */}
                <Row className="mt-3">
                  <Col>
                    <Button
                      variant="primary"
                      type="submit"
                      className="w-100"
                      style={{ fontSize: '0.875rem', padding: '10px 15px' }}
                    >
                      Register
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      variant="secondary"
                      onClick={handleCancel}
                      className="w-100"
                      style={{ fontSize: '0.875rem', padding: '10px 15px' }}
                    >
                      Cancel
                    </Button>
                  </Col>
                </Row>
              </Form>
            </div>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UserRegistration;
