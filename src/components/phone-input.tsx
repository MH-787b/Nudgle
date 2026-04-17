"use client";

import { useState } from "react";

const COUNTRIES = [
  { id: "gb", code: "+44", flag: "🇬🇧", name: "UK" },
  { id: "us", code: "+1", flag: "🇺🇸", name: "US" },
  { id: "ca", code: "+1", flag: "🇨🇦", name: "Canada" },
  { id: "ie", code: "+353", flag: "🇮🇪", name: "Ireland" },
  { id: "au", code: "+61", flag: "🇦🇺", name: "Australia" },
  { id: "nz", code: "+64", flag: "🇳🇿", name: "New Zealand" },
  { id: "fr", code: "+33", flag: "🇫🇷", name: "France" },
  { id: "de", code: "+49", flag: "🇩🇪", name: "Germany" },
  { id: "es", code: "+34", flag: "🇪🇸", name: "Spain" },
  { id: "it", code: "+39", flag: "🇮🇹", name: "Italy" },
  { id: "nl", code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { id: "be", code: "+32", flag: "🇧🇪", name: "Belgium" },
  { id: "pt", code: "+351", flag: "🇵🇹", name: "Portugal" },
  { id: "ch", code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { id: "at", code: "+43", flag: "🇦🇹", name: "Austria" },
  { id: "se", code: "+46", flag: "🇸🇪", name: "Sweden" },
  { id: "no", code: "+47", flag: "🇳🇴", name: "Norway" },
  { id: "dk", code: "+45", flag: "🇩🇰", name: "Denmark" },
  { id: "pl", code: "+48", flag: "🇵🇱", name: "Poland" },
  { id: "in", code: "+91", flag: "🇮🇳", name: "India" },
  { id: "za", code: "+27", flag: "🇿🇦", name: "South Africa" },
  { id: "ae", code: "+971", flag: "🇦🇪", name: "UAE" },
  { id: "jp", code: "+81", flag: "🇯🇵", name: "Japan" },
  { id: "kr", code: "+82", flag: "🇰🇷", name: "South Korea" },
  { id: "br", code: "+55", flag: "🇧🇷", name: "Brazil" },
  { id: "mx", code: "+52", flag: "🇲🇽", name: "Mexico" },
  { id: "ng", code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { id: "ph", code: "+63", flag: "🇵🇭", name: "Philippines" },
  { id: "sg", code: "+65", flag: "🇸🇬", name: "Singapore" },
  { id: "hk", code: "+852", flag: "🇭🇰", name: "Hong Kong" },
];

interface PhoneInputProps {
  onChange: (fullNumber: string) => void;
  id?: string;
  placeholder?: string;
}

export function PhoneInput({ onChange, id, placeholder = "7700 900000" }: PhoneInputProps) {
  const [countryId, setCountryId] = useState("gb");
  const [localNumber, setLocalNumber] = useState("");

  const selectedCountry = COUNTRIES.find((c) => c.id === countryId)!;

  function handleCodeChange(newId: string) {
    setCountryId(newId);
    const country = COUNTRIES.find((c) => c.id === newId)!;
    onChange(localNumber ? `${country.code} ${localNumber}` : "");
  }

  function handleNumberChange(value: string) {
    setLocalNumber(value);
    onChange(value ? `${selectedCountry.code} ${value}` : "");
  }

  const baseClass =
    "py-3 bg-surface-100 border border-surface-300 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition";

  return (
    <div className="flex gap-2">
      <select
        value={countryId}
        onChange={(e) => handleCodeChange(e.target.value)}
        className={`${baseClass} px-2 text-sm w-[120px] shrink-0`}
        aria-label="Country code"
      >
        {COUNTRIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        value={localNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
        className={`${baseClass} px-4 flex-1 min-w-0 placeholder:text-surface-500`}
        placeholder={placeholder}
      />
    </div>
  );
}
