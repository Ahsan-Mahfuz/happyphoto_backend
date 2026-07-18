import Property from "../app/module/property/Property";

const generatePropertyCode = async (): Promise<string> => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code: string;
  let exists = true;

  // Keep generating until we find a unique code
  while (exists) {
    let letterPart = "";
    for (let i = 0; i < 3; i++) {
      letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    const numberPart = Math.floor(1000 + Math.random() * 9000).toString();
    code = letterPart + numberPart;

    const existing = await Property.findOne({ propertyCode: code }).lean();
    if (!existing) {
      exists = false;
    }
  }

  return code!;
};

export = generatePropertyCode;
