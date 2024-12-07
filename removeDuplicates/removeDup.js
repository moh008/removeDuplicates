const fs = require("fs")

function loadJson(filePath) {
  try {
      const data = fs.readFileSync(filePath, "utf-8");
      slicedData = data.slice(data.indexOf('['), data.indexOf(']')+1)
      return JSON.parse(slicedData);
  } catch (error) {
      console.log("Couldn't open a json file");
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function removeDup(records) {
  const log = [];
  const uniqueById = new Map();
  const uniqueByEmail = new Map();

  records.forEach((record) => {
      const id = record._id;
      const email = record.email;
      const date = new Date(record.entryDate);

      const resolveConflict = (existing, incoming) => {
          const existingDate = new Date(existing.date);
          const incomingDate = new Date(incoming.date);

          if (incomingDate > existingDate) return incoming;
          if (incomingDate < existingDate) return existing;

          return incoming; // If dates are the same, prefer the last one
      };

      const updateLog = (existing, resolved, key) => {
          const changes = Object.keys(resolved).reduce((acc, field) => {
              if (existing[field] !== resolved[field]) {
                  acc.push({
                      field,
                      from: existing[field],
                      to: resolved[field],
                  });
              }
              return acc;
          }, []);
          if (changes.length > 0) {
              log.push({
                  source: existing,
                  output: resolved,
                  changes,
              });
          }
      };

      // Check and resolve ID conflicts
      if (id && uniqueById.has(id)) {
        console.log("Dup Id detected..")
        const resolved = resolveConflict(uniqueById.get(id), record);
        updateLog(uniqueById.get(id), resolved, "id");
        const existingEmail = uniqueById.get(id)
        console.log(existingEmail.email)
        
        uniqueById.delete(id);
        
        uniqueByEmail.delete(existingEmail.email);
        console.log(`Deleting Email ${existingEmail.email} from uniqueEmail`);
        
        uniqueById.set(id, resolved);
        uniqueByEmail.set(email, resolved);
      } else {  //Id is unique, but email is already in uniqueByEmail
        if(email && uniqueByEmail.has(email)){
          console.log("Dup Email detected..")
          const resolved = resolveConflict(uniqueByEmail.get(email), record);
          updateLog(uniqueByEmail.get(email), resolved, "email");
          
          const existingId = uniqueByEmail.get(email)
          console.log(existingId._id)

          uniqueByEmail.delete(email);
          
          uniqueById.delete(existingId._id);
          console.log(`Deleting Id ${existingId._id} from uniqueId`);

          uniqueById.set(id, resolved);
          uniqueByEmail.set(email, resolved);
        } else{
          uniqueById.set(id, record);
          uniqueByEmail.set(email, record);
        }
      }     
  });

  // Return unique records and log
  const uniqueRecords = Array.from(new Map([...uniqueById]).values());
  uniqueRecords.reverse()
  // for (const uniqueRecord of uniqueRecords){
  //   uniqueRecord.entryDate = new Date(uniqueRecord.entryDate)
  //   console.log(uniqueRecord.entryDate)
  // }
  // uniqueRecords.sort((a, b) => b.entryDate - a.entryDate);
  console.log("Unique Records", uniqueRecords);
  return { uniqueRecords, log };
}

function main() {
  // Load JSON data
  const records = loadJson("leads.json");

  // Deduplicate records
  const { uniqueRecords, log } = removeDup(records);

  // Save results and logs
  saveJson("Updated_leads.json", uniqueRecords);
  saveJson("change_log.json", log);

  console.log(`Update completed, Please refer "Updated_leads.json" file`)
}

main();