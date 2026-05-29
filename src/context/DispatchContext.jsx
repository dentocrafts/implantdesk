import { createContext, useContext, useState } from 'react';

const DispatchContext = createContext(null);

export function DispatchProvider({ children }) {
  const [caseId,      setCaseId]      = useState('');
  const [doctorName,  setDoctorName]  = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes,       setNotes]       = useState('');
  const [items,       setItems]       = useState([]);

  function addItem(component, qty = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.id === component.id);
      if (existing) return prev.map(i => i.id === component.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...component, qty }];
    });
  }

  function removeItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function updateQty(id, qty) {
    if (qty < 1) { removeItem(id); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }

  function clearDispatch() {
    setCaseId('');
    setDoctorName('');
    setPatientName('');
    setNotes('');
    setItems([]);
  }

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <DispatchContext.Provider value={{
      caseId,      setCaseId,
      doctorName,  setDoctorName,
      patientName, setPatientName,
      notes,       setNotes,
      items, addItem, removeItem, updateQty, clearDispatch,
      totalItems,
    }}>
      {children}
    </DispatchContext.Provider>
  );
}

export function useDispatchNote() {
  return useContext(DispatchContext);
}
