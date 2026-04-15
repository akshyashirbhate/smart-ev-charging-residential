// import { useState, useEffect } from "react"; 
// import axios from "axios"; 

// export default function AdminDashboard() {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchUsers = async () => {
//       try {
//         const res = await axios.get("http://192.168.1.8:5000/api/admin/users");
//         setUsers(res.data);
//       } catch (error) {
//         console.error("❌ Error fetching users:", error);
//         alert("Failed to fetch users. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUsers();
//   }, []);

//   return (
//     <div className="container mt-5 p-5 bg-dark text-light rounded shadow-lg">
//       <h2 className="text-warning text-center mb-4">Admin Dashboard</h2>

//       <div className="user-list p-4 bg-secondary rounded shadow-sm">
//         <h4 className="text-light mb-3">User Monthly Bills</h4>

//         {loading ? (
//           <p className="text-center text-warning">Loading users...</p>
//         ) : (
//           <table className="table table-dark table-striped">
//             <thead>
//               <tr>
//                 <th>ID</th>
//                 <th>Name</th>
//                 <th>Monthly Bill ($)</th>
//               </tr>
//             </thead>
//             <tbody>
//               {users.length > 0 ? (
//                 users.map((user) => (
//                   <tr key={user._id}>
//                     <td>{user._id}</td>
//                     <td>{user.name}</td>
//                     <td className="text-warning">₹{user.monthlyBill?.toFixed(2)}</td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="3" className="text-center text-danger">
//                     No users found
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         )}
//       </div>
//     </div>
//   );
// }


import { useState, useEffect } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/users");
        setUsers(res.data);
      } catch (error) {
        console.error("❌ Error fetching users:", error);
        alert("Failed to fetch users. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-dark text-light rounded shadow-lg p-4 sm:p-6 md:p-8">
        <h2 className="text-warning text-center mb-6 text-2xl sm:text-3xl font-semibold">Admin Dashboard</h2>

        <div className="bg-secondary rounded shadow-sm p-4 overflow-auto">
          <h4 className="text-light mb-4 text-lg sm:text-xl">User Monthly Bills</h4>

          {loading ? (
            <p className="text-center text-warning">Loading users...</p>

          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-striped table-bordered text-sm sm:text-base">
                <thead className="thead-light">
                  <tr>
                    {/* <th scope="col">ID</th> */}
                    <th scope="col">Name</th>
                    <th scope="col">Monthly Bill (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user._id}>
                        {/* <td>{user._id}</td> */}
                        <td>{user.name}</td>
                        <td className="text-warning">₹{user.monthlyBill?.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center text-danger">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
