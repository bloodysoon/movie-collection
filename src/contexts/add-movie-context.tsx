"use client";

import { createContext, useContext, useState } from "react";

interface AddMovieContextValue {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const AddMovieContext = createContext<AddMovieContextValue>({
  open: false,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export function AddMovieProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AddMovieContext.Provider
      value={{ open, openDrawer: () => setOpen(true), closeDrawer: () => setOpen(false) }}
    >
      {children}
    </AddMovieContext.Provider>
  );
}

export const useAddMovie = () => useContext(AddMovieContext);
