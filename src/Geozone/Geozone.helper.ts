export const geoZoneInsertField = (data?: any) => {
  return {
    name:{
      value:data?.name??"",
      error:"",
    },
    type: {
      value: data?.geoCodeData?.geometry?.type ?? "",
      error: "",
    },
    user: {
      value: data?.userId ?? "",
      error: "",
    },
    userEmail: {
      value: data?.userEmail ?? "",
      error: "",
    },
    mobileNumber: {
      value: data?.mobileNumber ?? "",
      error: "",
    },
    address: {
      value: data?.finalAddress ?? "",
      error: "",
    },
    zipCode: {
      value: data?.address?.zipCode ?? "",
      error: "",
    },
    country: {
      value: data?.address?.country ?? "",
      error: "",
    },
    state: {
      value: data?.address?.state ?? "",
      error: "",
    },
    area: {
      value: data?.address?.area ?? "",
      error: "",
    },
    city: {
      value: data?.address?.city ?? "",
      error: "",
    },
    district: {
      value: data?.address?.district ?? "",
      error: "",
    },
    lat: {
      value: data?.geoCodeData?.geometry?.coordinates?.[0]?.toString() ?? "",
      error: "",
    },
    long: {
      value: data?.geoCodeData?.geometry?.coordinates?.[1]?.toString() ?? "",
      error: "",
    },
    radius: {
      value: data?.geoCodeData?.geometry?.radius?.toString() ?? "",
      error: "",
    },
  }
}

// export const validateFields = (formField: any) => {
//   let isValid = true
//   const newFormField = { ...formField }[
//     // Check required fields
//     ("user", "mobileNumber", "zipCode", "address")
//   ].forEach((field) => {
//     if (!formField[field]?.value || formField[field].value.trim() === "") {
//       newFormField[field] = {
//         ...newFormField[field],
//         error: `Please enter ${field}.`,
//       }
//       isValid = false
//     }
//   })

//   // Special handling for radius if shape type is Circle
//   if (formField.type.value === "Circle" && (!formField.radius?.value || formField.radius.value === "0")) {
//     newFormField.radius = {
//       ...newFormField.radius,
//       error: "Please enter radius.",
//     }
//     isValid = false
//   }

//   return { isValid, newFormField }
// }

