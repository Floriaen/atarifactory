/**
 * Step class representing a step in the pipeline.
 */
class Step {
  constructor(id, description, type) {
    this.id = id;
    this.description = description;
    this.type = type;
  }
}

module.exports = Step; 