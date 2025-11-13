import React, { useState, useEffect, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { DeliveryPerson } from '../types';

interface NewDeliveryStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: DeliveryPerson;
}

const NewDeliveryStaffModal: React.FC<NewDeliveryStaffModalProps> = ({
  isOpen,
  onClose,
  staffToEdit
}) => {
  const { addDeliveryStaff, editDeliveryStaff } = useOrders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deliveryPerson, setDeliveryPerson] = useState({
    name: '',
    phone: '',
    avatar: '',
    trackingCode: ''
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (staffToEdit) {
      setDeliveryPerson({
        name: staffToEdit.name,
        phone: staffToEdit.phone,
        avatar: staffToEdit.avatar,
        trackingCode: staffToEdit.trackingCode || ''
      });
      setPreviewImage(staffToEdit.avatar);
    } else {
      setDeliveryPerson({
        name: '',
        phone: '',
        avatar: '',
        trackingCode: ''
      });
      setPreviewImage(null);
      setSelectedFile(null);
    }
  }, [staffToEdit]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (staffToEdit) {
      editDeliveryStaff(staffToEdit.id, deliveryPerson, selectedFile);
    } else {
      addDeliveryStaff(deliveryPerson, selectedFile);
    }
    setDeliveryPerson({ name: '', phone: '', avatar: '', trackingCode: '' });
    setPreviewImage(null);
    setSelectedFile(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {staffToEdit ? 'Editar Entregador' : 'Novo Entregador'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={deliveryPerson.name}
                onChange={(e) => setDeliveryPerson({ ...deliveryPerson, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={deliveryPerson.phone}
                onChange={(e) => setDeliveryPerson({ ...deliveryPerson, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de Rastreamento
              </label>
              <input
                type="text"
                value={deliveryPerson.trackingCode}
                onChange={(e) => setDeliveryPerson({ ...deliveryPerson, trackingCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ex: ABC123XY"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foto
              </label>
              <div className="mt-1 flex items-center gap-4">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Escolher Arquivo
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                {staffToEdit ? 'Salvar Alterações' : 'Adicionar Entregador'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewDeliveryStaffModal;