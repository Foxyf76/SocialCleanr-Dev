import React, { Fragment } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Landing from './components/landing/Landing';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';

const App = () => (
  <Router>
    <Fragment className='App'>
      <Route exact path='/' component={Landing} />
      <div className='container'>
        <Switch>
          <Route exact path='/login' component={Login}></Route>
          <Route exact path='/dashboard' component={Dashboard}></Route>
        </Switch>
      </div>
    </Fragment>
  </Router>
);

export default App;
