import { useState } from "react";

const initialState = {
  origin: "TPE",
  destination: "KIX",
  date_from: "",
  date_to: "",
  budget: "10000",
  cabin: "economy",
  direct_only: false,
  trip_type: "one_way",   // one_way | round_trip
  return_type: "stay_duration", // specific_date | stay_duration
  return_date: "",
  stay_duration: "5",
  platform: "trip",     // google | trip
};

export const useFlightWorkflow = () => {
  const [flightForm, setFlightForm] = useState(initialState);

  const setFlightField = (field: keyof typeof flightForm, value: string | boolean) => {
    setFlightForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetFlightForm = () => {
    setFlightForm(initialState);
  };

  const getLaunchConfig = () => {
    return {
      taskType: "flight_search",
      config: {
        origin: flightForm.origin,
        destination: flightForm.destination,
        date_from: flightForm.date_from,
        date_to: flightForm.date_to,
        budget: Number(flightForm.budget),
        cabin: flightForm.cabin,
        direct_only: flightForm.direct_only,
        trip_type: flightForm.trip_type,
        return_type: flightForm.return_type,
        return_date: flightForm.return_date,
        stay_duration: Number(flightForm.stay_duration) || 0,
        platform: flightForm.platform,
      },
    };
  };

  return {
    flightForm,
    setFlightForm,
    setFlightField,
    resetFlightForm,
    getLaunchConfig,
  };
};
