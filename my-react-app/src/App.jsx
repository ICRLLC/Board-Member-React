import { useState, useEffect } from "react";
import "./App.css";
import logo from "./assets/ICR-logo.svg";
import * as XLSX from "xlsx";
import ReactSelect from "react-select";
import { useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import React from "react";
import { debounce, set } from 'lodash';
import AsyncSelect from "react-select/async";

function App() {
  const [companies, setCompanies] = useState([]);
  const [matrixData, setMatrixData] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState("");
  const [includeExecs, setIncludeExecs] = useState(false);
  const [currentCompanyData, setCurrentCompanyData] = useState([]);
  const [prevCompanyData, setPrevCompanyData] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [storedProcedureData, setStoredProcedureData] = useState(null);
  const [currentProcedure, setCurrentProcedure] = useState("");
  const [personData, setPersonData] = useState([]);
  const [companyBoardMembers, setCompanyBoardMembers] = useState([]);
  const [members, setMembers] = useState([]);

// NEED TO CHANGE THESE to ENVIRONMENT VARIABLES
  // const port = 496; //  5002;
  // const backend_host = 'webapp.icrinc.com'; // import.meta.env.REACT_BACKEND_HOST;
  // const http_prefix = 'https://'

 // WHEN TESTNG .... 
  //  const port =  5002;
  //  const backend_host = 'localhost'; // import.meta.env.REACT_BACKEND_HOST;
  //  const http_prefix = 'http://'

  // WEB APP DEV SERVER TESTING
  //  const port =  5002;
  //  const backend_host = 'webappdev.icrinc.com'; // import.meta.env.REACT_BACKEND_HOST;
  //  const http_prefix = 'http://'

   const port =  496;
   const backend_host = 'webappdev.icrinc.com'; // import.meta.env.REACT_BACKEND_HOST;
   const http_prefix = 'https://'



  useEffect(() => {
    fetch(`${http_prefix}${backend_host}:${port}/api/companies`)
      .then((response) => response.json())
      .then((data) => setCompanies(data))
      .catch((error) => console.error("Error fetching companies:", error));
  }, []);

  const fetchMembers = (query) => {
    fetch(`${http_prefix}${backend_host}:${port}/api/members?q=${encodeURIComponent(query)}`)
      .then((response) => response.json())
      .then((data) => {
        setMembers(data)
      })
      .catch((error) => console.error("Error fetching members:", error));
      setCurrentCompanyData([]);
      setPrevCompanyData([]);
      setStoredProcedureData([]);
      setCurrentProcedure("");
      setMatrixData([]);
      setCompanyBoardMembers([]);
  }

  const handleSearchChange = debounce((event) => {
    const value = event.target.value.trim();
    if (value.length >= 3) {
      setSelectedTicker("");
      fetchMembers(value);
    }
  }, 300);

  const fetchMatrixData = () => {
    if (selectedTicker === "") {
      alert("Please select a company from the dropdown.");
      return;
    }
  
    fetch(
      `${http_prefix}${backend_host}:${port}/api/board-member-matrix?ticker=${selectedTicker}&includeExecs=${
        includeExecs ? 1 : 0
      }`
    )
      .then((response) => response.json())
      .then((data) => {
        if (!data || data.length === 0) {
          // Check if data is null, undefined, or an empty array
          alert("No data found for the selected company.");
        } else {
          // alert(JSON.stringify(data, null, 2));
          fetchTransformedData(data);
        }
      })
      .catch((error) => console.error("Error fetching matrix data:", error));
  
    setCurrentCompanyData([]);
    setPrevCompanyData([]);
    setStoredProcedureData([]);
    setCurrentProcedure("");
    setMembers([]);
  };

  const fetchCurrentCompanyData = (company) => {
    if (selectedTicker == "" && company == null) {
      alert("Please select a company from the dropdown");
      return;
    }
    fetch(
      `${http_prefix}${backend_host}:${port}/api/company-data?ticker=${selectedTicker}&company=${company}&mostRecent=1`
    )
      .then((response) => response.json())
      .then((data) => setCurrentCompanyData(data))
      .catch((error) => console.error("Error fetching companies:", error));
  };

  const fetchPrevCompanyData = (company) => {
    if (selectedTicker == "" && company == null) {
      alert("Please select a company from the dropdown");
      return;
    }
    fetch(
      `${http_prefix}${backend_host}:${port}/api/company-data?ticker=${selectedTicker}&company=${company}&mostRecent=0`
    )
      .then((response) => response.json())
      .then((data) => setPrevCompanyData(data))
      .catch((error) => console.error("Error fetching companies:", error));;
  };

  const fetchAllCompanyData = (company) => {
    setMatrixData([]);
    setStoredProcedureData([]);
    setCurrentProcedure("");
    setCompanyBoardMembers([]);
    setPersonData([])
    setMembers([]);

    fetchCurrentCompanyData(company);
    fetchPrevCompanyData(company);
    
  };

  const fetchCompanyBoardMembers = async (CompanyName) => {
    try {
      const response = await fetch(
        `${http_prefix}${backend_host}:${port}/api/get-company-board-members?company=${CompanyName}`
      );
      const data = await response.json();
      setCompanyBoardMembers(data);
      setPersonData([]);
      console.log(data);
    } catch (error) {
      console.error("Error fetching company board members:", error);
    }
  };

  const fetchTransformedData = (data) => {
    if (selectedTicker) {
      const memberCompanyMap = {};

      data.forEach((row) => {
        if (!memberCompanyMap[row.Name]) {
          memberCompanyMap[row.Name] = [];
        }
        memberCompanyMap[row.Name].push({
          CompanyName: row.CompanyName,
          Title: row.Title,
        });
      });

      const overlappingMembers = Object.keys(memberCompanyMap).filter(
        (name) => memberCompanyMap[name].length > 1
      );

      const overlappingMatrix = overlappingMembers.map((name) => {
        const companies = memberCompanyMap[name];
        return {
          Name: name,
          Companies: companies,
        };
      });

      setMatrixData(overlappingMatrix);
    }
  };

  useEffect(() => {
    if (matrixData.length > 0) {
      const uniqueCompanies = Array.from(
        new Set(
          matrixData.flatMap((person) =>
            person.Companies.map((c) => c.CompanyName)
          )
        )
      );
      setAllCompanies(uniqueCompanies);
    }
  }, [matrixData]);

  const executeStoredProcedure = async (procedureName) => {
    try {
      const response = await fetch(
        `${http_prefix}${backend_host}:${port}/api/${procedureName}`
      );
      const data = await response.json();
      setStoredProcedureData(data);
    } catch (error) {
      console.error("Error executing stored procedure:", error);
    }
    setMatrixData([]);
    setCurrentCompanyData([]);
    setPrevCompanyData([]);
    setCompanyBoardMembers([]);
    setPersonData([]);
    setMembers([]);
    if (procedureName === "get-old-board-members") {
      setCurrentProcedure("Aging Board Members");
    }
    if (procedureName === "get-new-client-boards") {
      setCurrentProcedure("Client Joining New Boards");
    }
    if (procedureName === "get-long-term-board-members") {
      setCurrentProcedure("Long Term Board Members");
    }
    if (procedureName === "get-board-high-turnover") {
      setCurrentProcedure("Boards with High Turnover");
    }
  };

  const fetchPersonData = async (personName) => {
    try {
      const response = await fetch(
        `${http_prefix}${backend_host}:${port}/api/get-person-data?name=${personName}`
      );
      const data = await response.json();
      setPersonData(data);
      setCompanyBoardMembers([]);
      setMembers([]);
      console.log(data);
    } catch (error) {
      console.error("Error fetching person details:", error);
    }
  };

  const options = useMemo(() => {
    return companies.map((company) => ({
      value: company.Ticker,
      label: company.CompanyName,
    }));
  }, [companies]);

  const customMenuList = (props) => {
    const { children, maxHeight } = props;
    const itemHeight = 50;
    const itemCount = React.Children.count(children);

    return (
      <List
        height={Math.min(maxHeight, itemCount * itemHeight)}
        itemCount={itemCount}
        itemSize={itemHeight}
        width="100%"
      >
        {({ index, style }) => <div style={style}>{children[index]}</div>}
      </List>
    );
  };

  const exportToExcel = () => {
    const data = [];
    let fileName = "";

    if (storedProcedureData.length > 0) {
      fileName = currentProcedure.replace(/ /g, "_");
      const header = Object.keys(storedProcedureData[0]);
      const rows = storedProcedureData.map((row) => Object.values(row));
      data.push([header, ...rows]);
    }

    if (matrixData.length > 0) {
      fileName = `${selectedTicker}_Overlapping_Board_Members`;
      const header = ["Name", ...allCompanies];
      const rows = matrixData.map((row) => [
        row.Name,
        ...allCompanies.map((company) => {
          const companyEntry = row.Companies.find(
            (c) => c.CompanyName === company
          );
          return companyEntry ? companyEntry.Title : "";
        }),
      ]);
      data.push([header, ...rows]);
    }

    if (currentCompanyData.length > 0) {
      fileName = `${selectedTicker}_Current_Company_Data`;
      const header = [
        "Name",
        "Ticker",
        "Title",
        "Age",
        "Sex",
        "Compensation",
        "Sector",
      ];
      const rows = currentCompanyData.map((row) => [
        row.Name,
        row.Ticker,
        row.Title,
        row.Age === 0 ? "Unknown" : row.Age,
        row.Sex,
        row.Compensation
          ? `$${new Intl.NumberFormat("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(row.Compensation)}`
          : "-",
        row.Sector,
      ]);
      data.push([header, ...rows]);
    }

    if (prevCompanyData.length > 0) {
      fileName = `${selectedTicker}_Previous_Company_Data`;
      const header = [
        "Name",
        "Ticker",
        "Title",
        "Age",
        "Sex",
        "Compensation",
        "Sector",
      ];
      const rows = prevCompanyData.map((row) => [
        row.Name,
        row.Ticker,
        row.Title,
        row.Age === 0 ? "Unknown" : row.Age,
        row.Sex,
        row.Compensation
          ? `$${new Intl.NumberFormat("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(row.Compensation)}`
          : "-",
        row.Sector,
      ]);
      data.push([header, ...rows]);
    }

    if (currentCompanyData.length > 0 && prevCompanyData.length > 0) {
      fileName = `${selectedTicker}_Curr_Prev_Company_Data`;
    }

    const ws = XLSX.utils.aoa_to_sheet(data.flat());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, fileName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };


  

  return (
    <div className="flex">
    <div>
      <p style={{marginLeft: '200px', color: '#666',  marginTop: '0px', marginBottom: '1px', padding: '0',  fontSize: '20px'}}>
      <strong>Board Member Data</strong></p>
      <p style={{marginLeft: '200px', color: '#666',  marginTop: '0px', marginBottom: '1px', padding: '0',  fontSize: '11px'}}>Explore interconnected board memberships, company histories, and organizational insights.</p>
       <p style={{marginLeft: '200px', color: '#666', fontStyle: 'italic', marginTop: '0px', marginBottom: '1px', padding: '0',  fontSize: '11px'}}>
       <strong>Note:</strong> Data is matched by full name, which may lead to potential inaccuracies.
       <p style={{  marginLeft: '200px',  margin: '1px', padding: '0' , fontSize: '11px' }}>Individuals with the same name could be incorrectly identified as the same person.
        Always verify and validate data before using it for critical analysis.</p>
       </p> 
     </div>
      <div className="main-container">
        <div className="button-panel">
          <div style={{ display: "flex", flexDirection: "row" }}>
            <img
              src={logo}
              style={{ width: "100px", alignContent: "center" }}
              alt="Logo"
            />
            <p style={{ marginLeft: "5px" }}>
              <b>Instructions:</b> Choose a company from the dropdown, click a
              button for results.
            </p>
          </div>
          <div className="searchable-select">
            <ReactSelect
              options={options}
              onChange={(selectedOption) =>
                setSelectedTicker(selectedOption.value)
              }
              placeholder="Select a company"
              components={{ MenuList: customMenuList }}
            />
          </div>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeExecs}
              onChange={(e) => setIncludeExecs(e.target.checked)}
            />
            <span>Include Executives</span>
          </label>
          <label className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search Board Members"
                onKeyDown={handleSearchChange}
              />
          </label>
          <button onClick={fetchMatrixData}>
            Fetch Overlapping Board Members
          </button>
          <button onClick={fetchAllCompanyData}>
            Fetch Company Board Members
          </button>
          <hr className="divider" />
          <button
            onClick={() => executeStoredProcedure("get-new-client-boards")}
          >
            Client Joining New Boards
          </button>
          <button
            onClick={() => executeStoredProcedure("get-old-board-members")}
          >
            Get Aging Board Members
          </button>
          <button
            onClick={() =>
              executeStoredProcedure("get-long-term-board-members")
            }
          >
            Long Term Board Members
          </button>
          <button
            onClick={() => executeStoredProcedure("get-board-high-turnover")}
          >
            High Turnover Companies
          </button>
          <button onClick={exportToExcel} className="excel-button">
            Export to Excel
          </button>
        </div>

        <div className="all-tables">
          {storedProcedureData && (
            <div className="table-container">
              <h3>
                <u>{currentProcedure}</u>
              </h3>
              <table>
                <thead>
                  <tr>
                    {Object.keys(storedProcedureData[0] || {}).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {storedProcedureData.map((row, index) => (
                    <tr key={index}>
                      {Object.entries(row).map(([key, value], i) => (
                        <td key={i}>
                          {key.toLowerCase() === "compensation" && value
                            ? `$${new Intl.NumberFormat("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }).format(value)}`
                            : key.toLowerCase().includes("_date") ||
                              key.toLowerCase().includes("addeddt2") ||
                              (key
                                .toLowerCase()
                                .includes("lastturnoverreportdate") &&
                                value)
                            ? new Date(value).toLocaleDateString("en-US")
                            : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {members.length > 0 && (
            <div className="table-container">
              
              <h3>
                <u>Member Search Results</u>
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Ticker</th>
                    <th>Company</th>
                    <th>Title</th>
                    <th>Age</th>
                    <th>Sex</th>
                    <th>Compensation</th>
                    <th>Sector</th>
                    </tr>
                </thead>
                <tbody>
                  {members.map((row, index) => (
                    <tr key={index}>
                      <td
                            style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                            onClick={() => fetchPersonData(row.Name)}
                      >
                        {row.Name}
                      </td>
                      <td>{row.Ticker}</td>
                      <td
                        style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                        onClick={() => {
                          fetchAllCompanyData(row.CompanyName);
                          setMembers([]);
                        }}
                        key={index}
                      >
                        {row.CompanyName}
                      </td>
                      <td>{row.Title}</td>
                      <td>{row.Age === 0 ? "Unknown" : row.Age}</td>
                      <td>{row.Sex}</td>
                      <td>{row.Compensation === 0 ? "Unknown" : `$${row.Compensation.toLocaleString('en-US')}`}</td>
                      <td>{row.Sector}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
            </div>
          )}

          {matrixData.length > 0 && (
            <div className="table-container">
              <h3>
                <u>Overlapping Board Members</u>
              </h3>
              Click on name to get board details, click on Company to get Board Member list
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    {allCompanies.map((company, index) => (
                      <th
                        style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                        onClick={() => {
                          fetchCompanyBoardMembers(company);
                        }}
                        key={index}
                      >
                        {company}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td>
                        <div className="container">
                          <span
                            className="trigger"
                            style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                            onClick={() => fetchPersonData(row.Name)}
                          >
                            {row.Name}
                          </span>
                          <span className="tooltip">
                            <b>{row.Name}</b>
                            <br />
                            <b>Tickers: </b>
                            {[
                              ...row.Companies.map((companyEntry) => {
                                const matchingCompany = companies.find(
                                  (c) =>
                                    c.CompanyName === companyEntry.CompanyName
                                );
                                return matchingCompany
                                  ? matchingCompany.Ticker
                                  : null;
                              }).filter(Boolean),
                              selectedTicker,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      </td>
                      {allCompanies.map((company, colIndex) => {
                        const companyEntry = row.Companies.find(
                          (c) => c.CompanyName === company
                        );
                        return (
                          <td key={colIndex}>
                            {companyEntry ? companyEntry.Title : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}



          {companyBoardMembers.length > 0 && (
            <div className="table-container">
              <br></br>
              <br></br>
              <h3>
                <u>Company Board Members</u>
              </h3>
              <table>
                <thead>
                <tr>
                    <th>Name</th>
                    <th>Title</th>
                    <th>Bio</th>
                  </tr>

                </thead>
                <tbody>
                  {companyBoardMembers.map((row, index) => (
                    <tr key={index}>
                      <td>{row.Name}</td>
                      <td>{row.Title}</td>
                      <td>{row.Bio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {currentCompanyData.length > 0 && (
            <div className="table-container">
              <h3>
                <u>Current Board Members</u>
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Ticker</th>
                    <th>Title</th>
                    <th>Age</th>
                    <th>Sex</th>
                    <th>Compensation</th>
                    <th>Sector</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCompanyData.map((row, index) => (
                    <tr key={index}>
                      <td 
                      style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={() => fetchPersonData(row.Name)}>{row.Name}</td>
                      <td>{row.Ticker}</td>
                      <td>{row.Title}</td>
                      <td>{row.Age === 0 ? "Unknown" : row.Age}</td>
                      <td>
                        {row.Sex
                          ? row.Sex.charAt(0).toUpperCase() +
                            row.Sex.slice(1).toLowerCase()
                          : ""}
                      </td>
                      <td>
                        {row.Compensation
                          ? `$${new Intl.NumberFormat("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(row.Compensation)}`
                          : "-"}
                      </td>
                      <td>{row.Sector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {prevCompanyData.length > 0 && (
                <>
                <br></br>
                <br></br>
                  <h3>
                    <u>Previous Board Members</u>
                  </h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Ticker</th>
                        <th>Title</th>
                        <th>Age</th>
                        <th>Sex</th>
                        <th>Compensation</th>
                        <th>Sector</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prevCompanyData.map((row, index) => (
                        <tr key={index}>
                          <td 
                          style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                          onClick={() => fetchPersonData(row.Name)}>{row.Name}</td>
                          <td>{row.Ticker}</td>
                          <td>{row.Title}</td>
                          <td>{row.Age}</td>
                          <td>{row.Sex}</td>
                          <td>
                            {row.Compensation
                              ? `$${new Intl.NumberFormat("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(row.Compensation)}`
                              : "-"}
                          </td>
                          <td>{row.Sector}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
          {personData.length > 0 && (
            <div className="table-container">
              <br></br>
              <br></br>
              <h3>
                <u>Person Company Data</u>
              </h3>
              <table>
                <thead>
                <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Sex</th>
                    <th>Status</th>
                    <th>Ticker</th>
                    <th>CompanyName</th>
                    <th>Title</th>
                    <th>Sector</th>
                    <th>Industry</th>
                    <th>Compensation</th>
                    <th>IsClient</th>
                    <th>Bio</th>
                   </tr>
                </thead>                
                
                <tbody>
                  
                  {personData.map((row, index) => (
                    <tr key={index}>
                      <td>{row.Name}</td>
                      <td>{row.Age}</td>
                      <td>{row.Sex}</td>
                      <td style={{ backgroundColor: row.Status === "Previous" ? "lightcoral" : "inherit" }}>
                        {row.Status}
                      </td>
                      <td>{row.Ticker}</td>
                      <td>{row.CompanyName}</td>
                      <td>{row.Title}</td>
                      <td>{row.Sector}</td>
                      <td>{row.Industry}</td>
                      <td>
                      {row.Compensation
                          ? `$${new Intl.NumberFormat("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(row.Compensation)}`
                          : "-"}
                      </td>
                      <td>{row.isClient}</td>
                      <td>{row.Bio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
