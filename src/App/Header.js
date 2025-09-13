import React, { useState, useMemo } from 'react';
import { Navbar, Container, Dropdown, FormControl, Spinner } from 'react-bootstrap';
import { useAuth } from '../AuthContext';

const Header = ({
  handleMenuToggle,
  handleProfileClick,
  handleMauzaChange,
  selectedMauza,
  setSelectedMauza,
 murabbaOptions = [],
  handleMurabbaSelection,
  // setShajraEnabled is no longer used here; metadata checking is centralized in MapComponent
}) => {
  const { user, loading } = useAuth();
  const [filterMauza, setFilterMauza] = useState('');
  const [filterMurabba, setFilterMurabba] = useState('');
  const [selectedMurabba, setSelectedMurabba] = useState('');
  const [lastSelectedMauza, setLastSelectedMauza] = useState(null);

  // Helper to convert murabbaOptions to a list that can be iterated and sorted
  const murabbaList = useMemo(
    () => (Array.isArray(murabbaOptions) ? murabbaOptions : []),
    [murabbaOptions]
  );

  const sortList = (list) => {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
      const isNumberA = /^\d+$/.test(a);
      const isNumberB = /^\d+$/.test(b);
      if (isNumberA && isNumberB) return Number(a) - Number(b);
      if (isNumberA) return -1;
      if (isNumberB) return 1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  // Filter & sort the Mauza list from the user's allowed mauzas
  const sortedMauzaList = useMemo(() => {
    const mauzas = user?.mauzaList || [];
    return sortList(
      mauzas.filter((mauza) =>
        mauza.toLowerCase().includes(filterMauza.toLowerCase())
      )
    );
  }, [user?.mauzaList, filterMauza]);

  // Filter & sort the Murabba list from geojson or server data
  const sortedMurabbaList = useMemo(() => {
    return sortList(
      murabbaList.filter((murabba) =>
        murabba.toLowerCase().includes(filterMurabba.toLowerCase())
      )
    );
  }, [murabbaList, filterMurabba]);

  /**
   * Called when the user selects a new Mauza from the dropdown.
   * Updates the parent (App.js) via handleMauzaChange and resets the selected Murabba.
   * Metadata verification is now handled solely in MapComponent.
   */
  const handleMauzaChangeInternal = (mauza) => {
    if (mauza !== lastSelectedMauza) {
      setLastSelectedMauza(mauza);
      setSelectedMurabba('');
      handleMauzaChange(mauza);
    }
  };

  const handleMauzaSelection = (mauza) => {
    setSelectedMauza(mauza);
    setFilterMauza('');
    handleMauzaChangeInternal(mauza);
  };

  return (
    <Navbar expand="lg" className="navbar-tech-theme">
      <Container fluid>
        {/* Left side: Menu toggle & Mauza dropdown */}
        <div className="navbar-left d-flex align-items-center">
          <Navbar.Brand onClick={handleMenuToggle} className="navbar-brand-custom">
            <i className="fas fa-bars"></i>
          </Navbar.Brand>
          {user && (
            <Dropdown>
              <Dropdown.Toggle variant="outline-light" id="mauza-dropdown" className="rounded-dropdown">
                {selectedMauza || 'Select Chak'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <FormControl
                  autoFocus
                  placeholder="Search Chak..."
                  onChange={(e) => setFilterMauza(e.target.value)}
                  value={filterMauza}
                />
                {sortedMauzaList.length > 0 ? (
                  sortedMauzaList.map((mauza, index) => (
                    <Dropdown.Item key={index} onClick={() => handleMauzaSelection(mauza)}>
                      {mauza}
                    </Dropdown.Item>
                  ))
                ) : (
                  <Dropdown.Item disabled>No Chak Found</Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
        {/* Right side: Murabba dropdown & user profile */}
        <div className="navbar-right d-flex align-items-center ms-auto">
          {user && (
            <Dropdown>
              <Dropdown.Toggle variant="outline-light" id="murabba-dropdown" className="rounded-dropdown">
                {selectedMurabba || 'Select Murabba'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <FormControl
                  autoFocus
                  placeholder="Search Murabba..."
                  onChange={(e) => setFilterMurabba(e.target.value)}
                  value={filterMurabba}
                />
                {sortedMurabbaList.length > 0 ? (
                  sortedMurabbaList.map((murabba, index) => (
                    <Dropdown.Item
                      key={index}
                      onClick={() => {
                        setSelectedMurabba(murabba);
                        setFilterMurabba('');
                        handleMurabbaSelection(murabba);
                      }}
                    >
                      {murabba}
                    </Dropdown.Item>
                  ))
                ) : (
                  <Dropdown.Item disabled>No Murabba Found</Dropdown.Item>
                )}
              </Dropdown.Menu>
                        </Dropdown>
          )}

          <div onClick={handleProfileClick} className="profile-container" style={{ cursor: 'pointer' }}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/2922/2922510.png"
              alt="User Icon"
              className="profile-icon"
            />
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : user ? (
              <span className="username">{user.userName}</span>
            ) : (
              <span className="username">Guest</span>
            )}
          </div>
        </div>
      </Container>
    </Navbar>
  );
};

export default Header;
