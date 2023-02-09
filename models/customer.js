/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

const queryBase = `SELECT c.id, 
  c.first_name AS "firstName",  
  c.last_name AS "lastName", 
  c.phone, 
  c.notes
  FROM customers AS c`;

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  fullName() {
    return this.firstName + ' ' + this.lastName;
  }

  get fullName() {
    return this.firstName + " " + this.lastName;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `${queryBase}
       ORDER BY c.last_name, c.first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `${queryBase} WHERE c.id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }

  /** search by name */
  static async search(term) {
    const searchTerm = '%' + term + '%';
    const results = await db.query(`
      ${queryBase}
      WHERE LOWER(c.first_name) LIKE LOWER($1)
      OR LOWER(c.last_name) LIKE LOWER($1)
    `, [searchTerm]);
    return results.rows.map(c => new Customer(c));
  }

  /** Top 10 customers with most reservations */

  static async topTen() {
    const results = await db.query(`
      ${queryBase}
      JOIN reservations AS r ON c.id = r.customer_id
      GROUP BY (c.id)
      ORDER BY COUNT(r.customer_id) DESC
      LIMIT 10;
    `);
    return results.rows.map(c => new Customer(c));
  }
}

module.exports = Customer;
