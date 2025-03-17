"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { getAddressDetailsByPincode } from "../services/geozone.service"

interface FormField {
  value: string
  error: string
}

interface FormFields {
  [key: string]: FormField
}

interface User {
  _id: string
  fullName: string
  email: string
}

interface CreateGeoZoneModalProps {
  isOpenModal: boolean
  handleUpdateDialogClose: () => void
  setFormField: (formField: any) => void
  formField: FormFields
  addGeozoneHandler: () => void
  users: User[]
  edit: boolean
  handleUserChange: (userId: string) => void
}

const CreateGeoZoneModal = ({
  isOpenModal,
  handleUpdateDialogClose,
  setFormField,
  formField,
  addGeozoneHandler,
  users,
  edit,
  handleUserChange,
}: CreateGeoZoneModalProps) => {
  const [zipCodeData, setZipCodeData] = useState<any[]>([])
  const [showZipCodeSuggestions, setShowZipCodeSuggestions] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpenModal) {
      setZipCodeData([])
      setShowZipCodeSuggestions(false)
      setSearchTerm("")
      setShowUserDropdown(false)
    }
  }, [isOpenModal])

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm.trim() === "") {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(
        (user) =>
          user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredUsers(filtered)
    }
  }, [searchTerm, users])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])
  console.log({formField})
console.log({user:formField.user?.value})
  useEffect(() => {
    // When in edit mode and a user is selected, set the search term
    if (edit && formField.user?.value) {
      const selectedUser = users.find((user) => user._id === formField.user.value)
      if (selectedUser) {
        setSearchTerm(selectedUser.fullName)
      }
    }
  }, [edit, formField.user?.value, users])

  const fetchZipCodeHandler = async (value: string) => {
    try {
      const res = await getAddressDetailsByPincode(value)
      setZipCodeData(res || [])
      setShowZipCodeSuggestions(true)
    } catch (error: any) {
      console.error("Error fetching zip code data:", error)
      setZipCodeData([])
    }
  }

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormField({
      ...formField,
      [name]: {
        ...formField[name],
        value: value,
        error: "",
      },
    })

    if (name === "zipCode" && value.length >= 6) {
      fetchZipCodeHandler(value)
    }
  }

  const handleZipCodeSelection = (item: any) => {
    setFormField({
      ...formField,
      country: { ...formField.country, value: item.Country, error: "" },
      state: { ...formField.state, value: item.State, error: "" },
      area: { ...formField.area, value: item.Name, error: "" },
      district: { ...formField.district, value: item.District, error: "" },
      city: { ...formField.city, value: item.Block, error: "" },
      zipCode: { ...formField.zipCode, value: item.Pincode, error: "" },
      address: {
        ...formField.address,
        value: `${item.Country} - ${item.State} - ${item.Name} - ${item.District} - ${item.Block}`,
        error: "",
      },
    })
    setShowZipCodeSuggestions(false)
  }

  const handleUserSelection = (user: User) => {
    setFormField({
      ...formField,
      user: { ...formField.user, value: user._id, error: "" },
      userEmail: { ...formField.userEmail, value: user.email, error: "" },
    })
    setSearchTerm(user.fullName)
    setShowUserDropdown(false)
    if (handleUserChange) {
      handleUserChange(user._id)
    }
  }

  const handleSearchFocus = () => {
    setShowUserDropdown(true)
  }

  if (!isOpenModal) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold dark:text-white">{edit ? "Update Geozone" : "Create Geozone"}</h2>
            <button
              onClick={handleUpdateDialogClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formField.name?.value || ""}
                onChange={handleOnChange}
                placeholder="Enter Name"
                className={`w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white ${
                  formField.name?.error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                maxLength={100}
              />
              {formField.name?.error && <p className="text-red-500 text-xs mt-1">{formField.name.error}</p>}
            </div>
            {/* User selection with search */}
            <div className="col-span-1 relative" ref={userDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                User <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={handleSearchFocus}
                placeholder="Search for a user..."
                className={`w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white ${
                  formField.user?.error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {formField.user?.error && <p className="text-red-500 text-xs mt-1">{formField.user.error}</p>}

              {showUserDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg rounded-md max-h-60 overflow-auto">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div
                        key={user._id}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer dark:text-white"
                        onClick={() => handleUserSelection(user)}
                      >
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-gray-500 dark:text-gray-400">No users found</div>
                  )}
                </div>
              )}
            </div>

            {/* User Email (read-only) */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User Email</label>
              <input
                type="text"
                name="userEmail"
                value={formField.userEmail?.value || ""}
                readOnly
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="mobileNumber"
                value={formField.mobileNumber?.value || ""}
                onChange={handleOnChange}
                placeholder="Enter Mobile Number"
                className={`w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white ${
                  formField.mobileNumber?.error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {formField.mobileNumber?.error && (
                <p className="text-red-500 text-xs mt-1">{formField.mobileNumber.error}</p>
              )}
            </div>

            <div className="col-span-1 relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Zip Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="zipCode"
                value={formField.zipCode?.value || ""}
                onChange={handleOnChange}
                placeholder="Enter Zip Code"
                className={`w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white ${
                  formField.zipCode?.error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {formField.zipCode?.error && <p className="text-red-500 text-xs mt-1">{formField.zipCode.error}</p>}

              {showZipCodeSuggestions && zipCodeData.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg rounded-md max-h-60 overflow-auto">
                  {zipCodeData.map((item, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer dark:text-white"
                      onClick={() => handleZipCodeSelection(item)}
                    >
                      {`${item.Pincode} - ${item.Country} - ${item.State} - ${item.Name}`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="country"
                value={formField.country?.value || ""}
                readOnly
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formField.state?.value || ""}
                readOnly
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white"
              />
            </div>

            {formField.area?.value && (
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Area <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="area"
                  value={formField.area?.value || ""}
                  readOnly
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white"
                />
              </div>
            )}

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formField.city?.value || ""}
                readOnly
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white"
              />
            </div>

            {formField.district?.value && (
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  District <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="district"
                  value={formField.district?.value || ""}
                  readOnly
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={formField.address?.value || ""}
                onChange={handleOnChange}
                placeholder="Enter Address"
                rows={3}
                className={`w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white ${
                  formField.address?.error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                maxLength={300}
              />
              {formField.address?.error && <p className="text-red-500 text-xs mt-1">{formField.address.error}</p>}
            </div>
          </div>

          <div className="flex justify-end mt-6 space-x-4">
            <button
              onClick={handleUpdateDialogClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={addGeozoneHandler}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {edit ? "Update" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateGeoZoneModal

